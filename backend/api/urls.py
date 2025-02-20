from django.urls import path
from .views import AudioFileUploadView, PatientCreateView, PatientDetailView, ScoreListView, PatientListView, PatientUpdateView, PatientDeleteView

urlpatterns = [
    # path('upload/', AudioFileUploadView.as_view(), name='audio-file-upload'),
    path('patients/create/', PatientCreateView.as_view(), name='patient-create'),  # for creating a patient
    path('patients/', PatientListView.as_view(), name='patient-list'),  # for viewing the patient list (GET)
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),  # for retrieving individual patient info
    path('patients/<int:patient_id>/scores/', ScoreListView.as_view(), name='patient-scores'),
    path('patients/<int:pk>/update/', PatientUpdateView.as_view(), name='patient-update'),
    path('patients/<int:pk>/delete/', PatientDeleteView.as_view(), name='patient-delete'),
]
