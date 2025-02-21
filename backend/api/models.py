from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

# extending default user model to allow role based access
class User(AbstractUser):
    ROLE_CHOICES = [
        ('SLP', 'Speech-Language Pathologist'),
        ('Patient', 'Patient'),
    ]
    role = models.CharField(max_length=7, choices=ROLE_CHOICES, default='Patient')

    def __str__(self):
        return self.username

# patient info model
class Patient(models.Model):
    name = models.CharField(max_length=100)
    age = models.IntegerField()
    medical_condition = models.TextField()

    def __str__(self):
        return self.name

# scores model (related to patient via foreign key)
class Score(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="scores")
    score_value = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Score for {self.patient.name} on {self.date}"

# audio model
class AudioFile(models.Model):
    # The audio file uploaded by the user
    file = models.FileField(upload_to='audio_files/')
    
    # Time when the file was uploaded
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Flag indicating if the audio has been processed
    processed = models.BooleanField(default=False)
    
    # The result of phoneme recognition (will be a list or dictionary of phonemes)
    result = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Audio File {self.id} - {self.uploaded_at}"

