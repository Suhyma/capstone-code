from django.urls import path
from .views import AudioFileUploadView, PatientCreateView, PatientDetailView, ScoreListView

urlpatterns = [
    # path('upload/', AudioFileUploadView.as_view(), name='audio-file-upload'),
    path('patients/', PatientCreateView.as_view(), name='patient-create'),
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),
    path('patients/<int:patient_id>/scores/', ScoreListView.as_view(), name='patient-scores'),
]
