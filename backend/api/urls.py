from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CustomTokenObtainPairView, PatientCreateView, PatientDetailView, ScoreListView, PatientListView, PatientUpdateView, PatientDeleteView, submit_audio

urlpatterns = [
    # path('upload/', AudioFileUploadView.as_view(), name='audio-file-upload'),
    path('patients/create/', PatientCreateView.as_view(), name='patient-create'),  # for creating a patient
    path('patients/', PatientListView.as_view(), name='patient-list'),  # for viewing the patient list (GET)
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),  # for retrieving individual patient info
    path('patients/<int:patient_id>/scores/', ScoreListView.as_view(), name='patient-scores'),
    path('patients/<int:pk>/update/', PatientUpdateView.as_view(), name='patient-update'),
    path('patients/<int:pk>/delete/', PatientDeleteView.as_view(), name='patient-delete'),
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('submit_audio/', views.submit_audio, name='submit_audio'),
]
