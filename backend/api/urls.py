from django.urls import path
from .views import AudioFileUploadView

urlpatterns = [
    path('upload/', AudioFileUploadView.as_view(), name='audio-file-upload'),
]
