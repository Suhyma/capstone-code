import Levenshtein
import numpy as np
from difflib import SequenceMatcher
from .phonemes import phoneme_bank_split
from .phoneme_similarity import PHONEME_SIMILARITY

def find_most_similar_word(prediction): # eventually, should not have to use this function. When that happens, calculate Lev. dist. in adjusted_lev function
    prediction_phonemes = prediction.split()
    most_similar_word = None
    min_distance = float('inf')  

    for word, phonemes in phoneme_bank_split.items():
        distance = Levenshtein.distance(prediction_phonemes, phonemes)
        if distance < min_distance:
            min_distance = distance
            most_similar_word = word

    return most_similar_word, min_distance, prediction_phonemes

def align_and_compare(prediction, correct):
    matcher = SequenceMatcher(None, prediction, correct)
    extra_phonemes = []
    missing_phonemes = []
    aligned_prediction = []
    aligned_correct = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            aligned_prediction.extend(prediction[i1:i2])
            aligned_correct.extend(correct[j1:j2])
        elif tag == "replace":
            # substitution mismatch does not relate to length
            aligned_prediction.extend(prediction[i1:i2])
            aligned_correct.extend(correct[j1:j2])
            extra_phonemes.extend(prediction[i1:i2])
            missing_phonemes.extend(correct[j1:j2])
        elif tag == "delete":
            # extra phonemes
            aligned_prediction.extend(prediction[i1:i2])
            aligned_correct.extend(["-"] * (i2 - i1))  
            extra_phonemes.extend(prediction[i1:i2])
        elif tag == "insert":
            # missing phonemes (ineherently occurs for any mismatch)
            aligned_prediction.extend(["-"] * (j2 - j1))  
            aligned_correct.extend(correct[j1:j2])
            missing_phonemes.extend(correct[j1:j2])

    print("Aligned Prediction: ", " ".join(aligned_prediction))
    print("Aligned Correct:    ", " ".join(aligned_correct))
    print("Extra Phonemes:     ", " ".join(extra_phonemes))
    print("Missing Phonemes:   ", " ".join(missing_phonemes))

    return extra_phonemes, missing_phonemes

def adjusted_levenshtein(raw_lev, extra_phonemes, missing_phonemes):
    '''Returns an adjusted Levenshtein distance that accounts for similar-sounding phonemes, especially vowels, 
       that don't necessarily mean a pronunciation is incorrect. This is especially applciable for vowels that, 
       when interchanged, don't make much of a difference on the word's pronunciation and meaning. See phoneme similarity
       dictionary in phoneme_similarity.py.
    '''
    # if there is a phoneme pairing that exists in the phoneme similarity matrix, reduce Lev. distance penalty
    final_lev = raw_lev

    for extra, missing in zip(extra_phonemes, missing_phonemes):
        phoneme_pair = (extra, missing)
        reverse_pair = (missing, extra)

        if phoneme_pair in PHONEME_SIMILARITY:
            penalty_reduction = PHONEME_SIMILARITY[phoneme_pair]
            final_lev -= (1 - penalty_reduction)
            print("replaced phonemes: " + str(phoneme_pair))

        elif reverse_pair in PHONEME_SIMILARITY:
            penalty_reduction = PHONEME_SIMILARITY[reverse_pair]
            final_lev -= (1 - penalty_reduction)
            print("replaced phonemes: " + str(reverse_pair))

    return max(0, final_lev)


def get_score(prediction):
    '''Calculates the performance score based on Levenshtein distance,
       normalizing based on word & prediction lengths. Penalties are made for
       missing phonemes, extra phonemes, and substitutions. This calculated
       score determines how feedback is given and how to proceed in the exercise
       workflow.
    '''
    # find the closest matching word + phonemes from the word bank
    # TODO: EVENTUALLY REPLACE THIS WITH "CURRENT EXERCISE WORD" rather than looking for what possible word it is
    # or, add an if statement to check if the detected word is similar to the actual assigned word
    correct_word, lev_distance, prediction_phonemes = find_most_similar_word(prediction)   

    if correct_word is None:
        return 0  # no valid match found
    correct_phonemes = phoneme_bank_split[correct_word]
    print("original lev: " + str(lev_distance))

    # align and analyze phonemes
    extra_phonemes, missing_phonemes = align_and_compare(prediction_phonemes, correct_phonemes)
    
    # create a score based on adjusted Levenshtein distance
    max_length = max(len(prediction_phonemes), len(correct_phonemes))
    if max_length == 0:
        return 0 
    
    adj_lev_distance = adjusted_levenshtein(lev_distance, extra_phonemes, missing_phonemes)
    print("adj lev: " + str(adj_lev_distance))

    # normalized score (1 - distance ratio)
    raw_score = 1 - (adj_lev_distance / max_length) 
    # if the score is less than 0.5, completely wrong and try again w feedback; if between certain ranges, almost there, give feedback and try again to improve; if close to 1, can move on
    # need to test score sensitivity

    final_score = max(0, raw_score)  # ensure score is not negative
    return final_score, extra_phonemes, missing_phonemes


def get_session_score(all_scores): # where all_scores is an array of all the scores in the session
    return np.mean(all_scores)
