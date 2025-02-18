from rest_framework import serializers
from .models import AudioFile, Patient, Score

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

# score model serializer (read-only since scores are generated in the backend)
class ScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Score
        fields = ['patient', 'score_value', 'date']
        read_only_fields = ['patient', 'date']  # Don't let users directly modify these