import torch
from transformers import AutoProcessor, AutoModelForCTC, Wav2Vec2Processor
import librosa
import torch
from itertools import groupby
import subprocess
import os
import tempfile
import sounddevice as sd

def decode_phonemes(ids: torch.Tensor, processor: Wav2Vec2Processor, ignore_stress: bool = True) -> str:
    """CTC-like decoding. First removes consecutive duplicates, then removes special tokens."""
    # removes consecutive duplicates
    ids = [id_ for id_, _ in groupby(ids)]

    special_token_ids = processor.tokenizer.all_special_ids + [
        processor.tokenizer.word_delimiter_token_id
    ]
    # converts id to token, skipping special tokens
    phonemes = [processor.decode(id_) for id_ in ids if id_ not in special_token_ids]

    # joins phonemes
    prediction = " ".join(phonemes)

    # whether to ignore IPA stress marks
    if ignore_stress == True:
        prediction = prediction.replace("ˈ", "").replace("ˌ", "")

    return prediction

def play_audio(audio_array, sr):
    sd.play(audio_array, sr)
    sd.wait()

def convert_mov_to_wav(input_path):
    # Create a unique temp filename using NamedTemporaryFile
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
        output_path = temp_wav.name

    # FFmpeg command to convert MOV to WAV
    command = [
        "ffmpeg", "-i", input_path, "-vn",
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Conversion successful. Saved to: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"Error during conversion: {e}")
        return None

def extract_phonemes(audiofile):
    checkpoint = "bookbot/wav2vec2-ljspeech-gruut"
    model = AutoModelForCTC.from_pretrained(checkpoint)
    processor = AutoProcessor.from_pretrained(checkpoint)
    sr = processor.feature_extractor.sampling_rate

    print(f"Received audio file: {audiofile.name}")
    # wav_path = audiofile.name.replace(".mov", ".wav")
    wav_path = convert_mov_to_wav(audiofile.name)

    # reading a single audio file
    # audio_array, _ = librosa.load(audiofile, sr=sr)
    # audio_array, _ = librosa.load(audiofile.path, sr=sr)
    audio_array, _ = librosa.load(wav_path, sr=sr)
    print(f"Audio file loaded. Sample rate: {sr}, Audio length: {len(audio_array)} samples")
    play_audio(audio_array, sr)
    inputs = processor(audio_array, return_tensors="pt", padding="longest", truncation=True, max_length=35000)

    with torch.no_grad():
        logits = model(inputs["input_values"]).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    prediction = decode_phonemes(predicted_ids[0], processor, ignore_stress=True)
    # => should give 'b ɪ k ʌ z j u ɚ z s l i p ɪ ŋ ɪ n s t ɛ d ə v k ɔ ŋ k ɚ ɪ ŋ ð ə l ʌ v l i ɹ z p ɹ ɪ n s ə s h æ z b ɪ k ʌ m ə v f ɪ t ə l w ɪ θ n b oʊ p ɹ ə ʃ æ ɡ i s ɪ t s ð ɛ ɹ ə k u ɪ ŋ d ʌ v'

    os.remove(wav_path)
    return prediction



