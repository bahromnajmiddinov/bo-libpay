from django.db import models
from django.contrib.auth.models import User


class Seller(models.Model):
    """Model representing a seller/merchant"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=200)
    business_address = models.TextField()
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    tax_id = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.business_name} ({self.user.username})"

    class Meta:
        verbose_name = "Seller"
        verbose_name_plural = "Sellers"