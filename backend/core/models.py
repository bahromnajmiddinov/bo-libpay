from django.db import models
from user.models import CustomUser

from user.models import Organization


class BaseModel(models.Model):
    organization = models.ForeignKey(Organization,
                                     on_delete=models.CASCADE,
                                     related_name="%(class)s_organization")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Seller(BaseModel):
    """Model representing a seller/merchant"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=200, blank=True, null=True)
    business_address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.business_name} ({self.user.username})"

    class Meta:
        verbose_name = "Seller"
        verbose_name_plural = "Sellers"
