import Levenshtein

def find_most_similar_word(prediction, phoneme_bank_split):
    prediction_phonemes = prediction.split()
    most_similar_word = None
    min_distance = float('inf')  

    for word, phonemes in phoneme_bank_split.items():
        distance = Levenshtein.distance(" ".join(prediction_phonemes), " ".join(phonemes))
        if distance < min_distance:
            min_distance = distance
            most_similar_word = word

    return most_similar_word, min_distance, prediction_phonemes
