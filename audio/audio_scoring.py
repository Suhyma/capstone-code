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

# # word = "carrot"
# word = "insulators"
# correct_phonemes = phoneme_bank_split[word]
# extra_phonemes, target_phonemes = align_and_compare(prediction_phonemes, correct_phonemes)