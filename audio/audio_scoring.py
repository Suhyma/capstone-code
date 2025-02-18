import Levenshtein
from difflib import SequenceMatcher

def find_most_similar_word(prediction, phoneme_bank_split): # find a better way to reference the phoneme word bank
    prediction_phonemes = prediction.split()
    most_similar_word = None
    min_distance = float('inf')  

    for word, phonemes in phoneme_bank_split.items():
        distance = Levenshtein.distance(" ".join(prediction_phonemes), " ".join(phonemes))
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

def get_score(prediction, phoneme_bank_split):
    '''Calculates the performance score based on Levenshtein distance,
       normalizing based on word & prediction lengths. Penalties are made for
       missing phonemes, extra phonemes, and substitutions. This calculated
       score determines how feedback is given and how to proceed in the exercise
       workflow.
    '''
    # find the closest matching word + phonemes from the word bank
    correct_word, lev_distance, prediction_phonemes = find_most_similar_word(prediction, phoneme_bank_split) # EVENTUALLY REPLACE THIS WITH "CURRENT EXERCISE WORD" rather than looking for what possible word it is
    if correct_word is None:
        return 0  # no valid match found
    correct_phonemes = phoneme_bank_split[correct_word]

    # align and analyze phonemes
    extra_phonemes, missing_phonemes = align_and_compare(prediction_phonemes, correct_phonemes)
    
    # create a score based on Levenshtein distance
    max_length = max(len(prediction_phonemes), len(correct_phonemes))
    if max_length == 0:
        return 0 

    # normalized score (1 - distance ratio)
    raw_score = 1 - (lev_distance / max_length) 
    # if the score is less than 0.5, completely wrong and try again; if between certain ranges, give feedback and try again to improve; if close to 1, can move on
    # need to test score sensitivity

    # apply penalties based on missing and extra phonemes
    penalty = (len(extra_phonemes) + len(missing_phonemes)) / (2 * max_length) # the max error is 2N where N is the max_length
    # consider weighing different errors differently, e.g. additions and deletions vs substitution -> does this make sense though if it's aimed to treat substitutions

    final_score = max(0, raw_score - penalty)  # ensure score is not negative
    return final_score
