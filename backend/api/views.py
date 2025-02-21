from django.shortcuts import render, redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import AudioFileSerializer, PatientSerializer, ScoreSerializer, UserRegistrationSerializer, UserLoginSerializer
from .models import AudioFile, Patient, Score
from rest_framework import generics
from rest_framework.generics import ListAPIView
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from rest_framework.permissions import IsAuthenticated
# from .phoneme_recognition import decode_phonemes, model, processor, sr  # Import from phoneme_recognition.py

# import librosa
# import torch

# Create your views here.

# View for creating a patient (name, age, and medical condition)
class PatientCreateView(generics.CreateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

# View for retrieving entire patient list
class PatientListView(ListAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

# View for updating a specific patient's info
class PatientUpdateView(generics.UpdateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    lookup_field = 'pk'  # You can use 'pk' to look up a patient by primary key
    permission_classes = [IsAuthenticated]

# View for deleting a patient
class PatientDeleteView(generics.DestroyAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

# View for retrieving specific individual patient info (including scores related to the patient)
class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

# User Registration View (for API)
@api_view(['POST'])
def register_user(request):
    if request.method == 'POST':
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# User Login View (for API)
@api_view(['POST'])
def login_user(request):
    if request.method == 'POST':
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(username=serializer.validated_data['username'], password=serializer.validated_data['password'])
            if user:
                return Response({"message": "Login successful!"}, status=status.HTTP_200_OK)
            return Response({"message": "Invalid credentials!"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

