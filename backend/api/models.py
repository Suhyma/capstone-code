from django.db import models
from django.conf import settings
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
    user = models.OneToOneField(User, on_delete=models.CASCADE)  # Links patient to user
    name = models.CharField(max_length=100)
    age = models.IntegerField()
    medical_condition = models.TextField()

    def __str__(self):
        return self.name

# scores model (related to patient via foreign key)
class Score(models.Model):
    """Stores the final exercise score for a patient."""
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE)
    score_value = models.FloatField()
    date = models.DateTimeField(auto_now_add=True)

# audio model
class AudioFile(models.Model):
    """Model to temporarily store an uploaded audio file for processing."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)  # Allow null temporarily
    file = models.FileField(upload_to='temp_audio/')  # Temporarily stored file
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)  # Optional if you need it
    result = models.JSONField(null=True, blank=True)  # Add this line


