from django.db import models
from user.models import CustomUser

from core.models import BaseModel

class Customer(BaseModel):
    """Model representing a customer"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    address = models.TextField()
    date_of_birth = models.DateField(null=True, blank=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
