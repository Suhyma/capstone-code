from phoneme_extraction import extract_phonemes
from audio_scoring import get_score
from audio_feedback import generate_feedback_for_target

# general pipeline: record audio -> phoneme_extraction.py -> audio_scoring.py -> audio_feedback.py

# step 1: record audio TODO: implementation of this with the frontend

# step 2: extract phonemes
predicted_phonemes = extract_phonemes("data/panel_exam_demo/belly.wav")
print(predicted_phonemes)

# step 3: give score
score, extra_phonemes, missing_phonemes = get_score(predicted_phonemes)
print("score:")
print(score)

# step 4: give feedback
target_phoneme = 'ɹ' # this would be set by the exercise workflow we are in
feedbacks = []

for i in range(len(missing_phonemes)):
    target_sound = missing_phonemes[i]
    detected_sound = extra_phonemes[i]
    f =  generate_feedback_for_target(detected_sound, target_sound)
    feedbacks.append(f)
print("feedback:")
print(feedbacks)