from rest_framework import serializers
from .models import AudioFile, Patient, Score
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


# audio model serializer
class AudioFileSerializer(serializers.ModelSerializer):
    """Handles audio file upload"""
    class Meta:
        model = AudioFile
        fields = ['file']

# patient model serializer
class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['id', 'name', 'age', 'medical_condition']

# Registration serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = get_user_model().objects.create_user(**validated_data)
        return user

# Login serializer
class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

# Token serializer
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  # Role is added inside the token payload
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role  # This makes 'role' appear in the JSON response
        return data

# Score serializer
class ScoreSerializer(serializers.ModelSerializer):
    """Handles score storage"""
    class Meta:
        model = Score
        fields = ['patient', 'score_value', 'date']