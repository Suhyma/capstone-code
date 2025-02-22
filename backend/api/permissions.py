from rest_framework.permissions import BasePermission

class IsSLP(BasePermission):
    """Allows access only to SLP users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "SLP"  

class IsPatientOwner(BasePermission):
    """Allows patients to view their own data only."""
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.user == request.user  # Assuming Patient model has a ForeignKey to User

class IsPatientOrSLP(BasePermission):
    """Allows SLPs to view any patient, and patients to view only their own data."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role == "SLP":
            return True  # SLPs can access all patient data
        return obj.user == request.user  # Patients can only access their own data

class IsPatient(BasePermission):
    """Only patients can submit recordings."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Patient"