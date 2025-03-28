# import torch
# print(torch.__version__)
# print(torch.cuda.is_available()) 

# from transformers import AutoProcessor, AutoModelForCTC, Wav2Vec2Processor
# import librosa
# import torch
# from itertools import groupby
# from datasets import load_dataset

# def decode_phonemes(
#     ids: torch.Tensor, processor: Wav2Vec2Processor, ignore_stress: bool = False
# ) -> str:
#     """CTC-like decoding. First removes consecutive duplicates, then removes special tokens."""
#     # removes consecutive duplicates
#     ids = [id_ for id_, _ in groupby(ids)]

#     special_token_ids = processor.tokenizer.all_special_ids + [
#         processor.tokenizer.word_delimiter_token_id
#     ]
#     # converts id to token, skipping special tokens
#     phonemes = [processor.decode(id_) for id_ in ids if id_ not in special_token_ids]

#     # joins phonemes
#     prediction = " ".join(phonemes)

#     # whether to ignore IPA stress marks
#     if ignore_stress == True:
#         prediction = prediction.replace("'", "").replace("ˌ", "")

#     return prediction

# checkpoint = "bookbot/wav2vec2-ljspeech-gruut"

# model = AutoModelForCTC.from_pretrained(checkpoint)
# processor = AutoProcessor.from_pretrained(checkpoint)
# sr = processor.feature_extractor.sampling_rate

# # # load dummy dataset and read soundfiles
# # ds = load_dataset("patrickvonplaten/librispeech_asr_dummy", "clean", split="validation")
# # audio_array = ds[0]["audio"]["array"]

# # or, read a single audio file
# audio_array, _ = librosa.load("panel_exam/wight.wav", sr=sr)

# inputs = processor(audio_array, return_tensors="pt", padding=True)

# with torch.no_grad():
#     logits = model(inputs["input_values"]).logits

# predicted_ids = torch.argmax(logits, dim=-1)
# prediction = decode_phonemes(predicted_ids[0], processor, ignore_stress=True)
# # => should give 'b ɪ k ʌ z j u ɚ z s l i p ɪ ŋ ɪ n s t ɛ d ə v k ɔ ŋ k ɚ ɪ ŋ ð ə l ʌ v l i ɹ z p ɹ ɪ n s ə s h æ z b ɪ k ʌ m ə v f ɪ t ə l w ɪ θ n b oʊ p ɹ ə ʃ æ ɡ i s ɪ t s ð ɛ ɹ ə k u ɪ ŋ d ʌ v'

# prediction_tokens = prediction.split()  # Tokenize the phoneme string
# prediction_tokens = [token for token, _ in groupby(prediction_tokens)]  # Remove consecutive duplicates
# prediction = " ".join(prediction_tokens)  # Recombine into a single string

# print(prediction)

