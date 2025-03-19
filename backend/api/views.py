import sys
import os
from django.shortcuts import render, redirect, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import AudioFileSerializer, PatientSerializer, ScoreSerializer, UserRegistrationSerializer, UserLoginSerializer, CustomTokenObtainPairSerializer
from .models import AudioFile, Patient, Score
from rest_framework import generics
from rest_framework.generics import ListAPIView
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from rest_framework.permissions import IsAuthenticated
from .permissions import IsSLP, IsPatientOrSLP, IsPatient
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.files import File
import requests
import tempfile
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from audio.phoneme_extraction import extract_phonemes, convert_mov_to_wav  # Import the phoneme extraction function
from audio.phonemes import phoneme_bank_split
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

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


logger = logging.getLogger(__name__)
# uploading audio
@api_view(['POST'])
@authentication_classes([])  # Disable authentication for now
@permission_classes([])  # Disable permissions for now
def submit_audio(request):
    """
    Endpoint for patients to submit their recorded audio for processing.
    """
    # Expecting the download URL from the frontend
    uri = request.data.get('audio_file')
    if not uri:
        logger.error("No audio URL provided")
        return Response({'error': 'No audio URL provided'}, status=400)

    try:
        # Step 1: Download the .mov file from the Firebase URL
        logger.debug(f"Downloading audio from URL: {uri}")
        response = requests.get(uri)
        if response.status_code != 200:
            logger.error(f"Failed to fetch audio from URL: {uri}")
            return Response({'error': 'Failed to fetch audio from URL'}, status=400)

        # Step 2: Create temporary files for .mov and .wav
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mov') as tmp_mov_file:
            tmp_mov_file.write(response.content)
            tmp_mov_path = tmp_mov_file.name

        logger.debug(f"Temporary .mov file saved at: {tmp_mov_path}")

        tmp_wav_path = tempfile.mktemp(suffix='.wav')
        try:
            logger.debug(f"Converting .mov to .wav")
            tmp_wav_path = convert_mov_to_wav(tmp_mov_path)
        except Exception as e:
            logger.error(f"Error during .mov to .wav conversion: {e}")
            return Response({'error': f'Error during .mov to .wav conversion: {str(e)}'}, status=500)

        # Step 3: Process the .wav file (phoneme extraction, scoring, feedback)
        try:
            logger.debug("Processing the .wav file")
            with open(tmp_wav_path, 'rb') as wav_file:
                phoneme_results = extract_phonemes(wav_file)
                logger.debug("Phoneme extraction successful")
                score, extra_phonemes, missing_phonemes = get_score(phoneme_results)
                feedback = []
                for extra, target in zip(extra_phonemes, missing_phonemes):
                    feedback.extend(generate_feedback_for_target(extra, target))
                logger.debug(f"Feedback generated: {feedback}")
        except Exception as e:
            logger.error(f"Error during audio processing: {e}")
            return Response({'error': f'Error during audio processing: {str(e)}'}, status=500)
        finally:
            # Cleanup temp files safely
            if os.path.exists(tmp_mov_path):
                os.remove(tmp_mov_path)
            if os.path.exists(tmp_wav_path):
                os.remove(tmp_wav_path)

        # Step 4: Return feedback and score
        return Response({'score': score, 'feedback': feedback})

    except Exception as e:
        logger.error(f"Error during audio submission: {e}")
        return Response({'error': f'Error: {str(e)}'}, status=500)

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