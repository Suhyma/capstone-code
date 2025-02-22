from django.shortcuts import render, redirect, get_object_or_404
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
from .permissions import IsSLP, IsPatientOrSLP, IsAuthenticated, IsPatient
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from audio.phoneme_extraction import extract_phonemes  # Import the phoneme extraction function
from audio.audio_scoring import get_score  # Import the scoring function
from audio.audio_feedback import generate_feedback_for_target

# import librosa
# import torch

# Create your views here.

# View for creating a patient (name, age, and medical condition)
class PatientCreateView(generics.CreateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsSLP]

# View for retrieving entire patient list
class PatientListView(ListAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsSLP]

# View for updating a specific patient's info
class PatientUpdateView(generics.UpdateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    lookup_field = 'pk'  # You can use 'pk' to look up a patient by primary key
    permission_classes = [IsAuthenticated, IsSLP]

# View for deleting a patient
class PatientDeleteView(generics.DestroyAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsSLP]

# View for retrieving specific individual patient info (including scores related to the patient)
class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated, IsPatientOrSLP]

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

# uploading audio
@api_view(['POST'])
def submit_audio(request):
    """
    Endpoint for patients to submit their recorded audio for processing.
    """
    parser_classes = [MultiPartParser]

    if 'audio_file' not in request.FILES:
        return JsonResponse({'error': 'No audio file provided'}, status=400)

    audio_file = request.FILES['audio_file']
    audio_instance = AudioFile.objects.create(user=request.user, file=audio_file)

    try:
        
        phoneme_results = extract_phonemes(audio_instance.file)
        score, extra_phonemes, missing_phonemes = get_score(phoneme_results)
        feedback = []
        for extra, target in zip(extra_phonemes, missing_phonemes):
            feedback.extend(generate_feedback_for_target(extra, target))

    finally:
        audio_instance.file.delete(save=False)  # This removes the file from the filesystem
        audio_instance.delete()  # Optionally remove the AudioFile instance itself

    return JsonResponse({
        'feedback': feedback,
    })

# patient viewing own final scores
class FinalScoreView(APIView):
    """Stores the final exercise score after 5 word attempts"""
    permission_classes = [IsPatient]

    def post(self, request, *args, **kwargs):
        patient = request.user  # Assuming patient is the logged-in user
        final_score = request.data.get("final_score")

        if final_score is None:
            return Response({"error": "Final score required"}, status=status.HTTP_400_BAD_REQUEST)

        Score.objects.create(patient=patient, score_value=final_score)
        return Response({"message": "Final score saved successfully!"}, status=status.HTTP_201_CREATED)
    

# SLP viewing patient's scores
class ScoreListView(APIView):
    """SLP can view a patient's final exercise scores"""
    permission_classes = [IsSLP]

    def get(self, request, patient_id):
        patient = get_object_or_404(Patient, id=patient_id)
        scores = Score.objects.filter(patient=patient)
        serializer = ScoreSerializer(scores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)