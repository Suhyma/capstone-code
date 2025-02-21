from rest_framework import serializers
from .models import AudioFile, Patient, Score
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

# audio model serializer
class AudioFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioFile
        fields = '__all__'  

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

# score model serializer (read-only since scores are generated in the backend)
class ScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Score
        fields = ['patient', 'score_value', 'date']
        read_only_fields = ['patient', 'date']  # Don't let users directly modify these