from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import AudioFileSerializer, PatientSerializer, ScoreSerializer
from .models import AudioFile, Patient, Score
from rest_framework import generics
# from .phoneme_recognition import decode_phonemes, model, processor, sr  # Import from phoneme_recognition.py

# import librosa
# import torch

# Create your views here.

# View for creating a patient (only name, age, and medical condition)
class PatientCreateView(generics.CreateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

# View for retrieving patient info (including scores related to the patient)
class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

# View for retrieving scores associated with a patient
class ScoreListView(generics.ListAPIView):
    queryset = Score.objects.all()
    serializer_class = ScoreSerializer

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        return Score.objects.filter(patient__id=patient_id)

class AudioFileUploadView(APIView):
    def post(self, request, *args, **kwargs):
        # Deserialize the incoming request data and save the file
        serializer = AudioFileSerializer(data=request.data)
        if serializer.is_valid():
            audio_file = serializer.save()
            
            # Get the path of the uploaded audio file
            audio_path = audio_file.file.path
            
            # Load the audio file
            audio_array, _ = librosa.load(audio_path, sr=sr)

            # Process the audio input and run through the phoneme recognition model
            inputs = processor(audio_array, return_tensors="pt", padding=True)
            with torch.no_grad():
                logits = model(inputs["input_values"]).logits
            predicted_ids = torch.argmax(logits, dim=-1)

            # Decode the phonemes
            phonemes = decode_phonemes(predicted_ids[0], processor, ignore_stress=True)

            # Save the result back to the model
            audio_file.result = phonemes
            audio_file.processed = True
            audio_file.save()

            # Return the phonemes in the response
            return Response({"phonemes": phonemes}, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

