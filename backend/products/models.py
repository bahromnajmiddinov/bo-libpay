from django.db import models
from django.core.validators import MinValueValidator
from core.models import Seller
from core.models import BaseModel


class Category(BaseModel):
    """Product categories"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"


class Product(BaseModel):
    """Model representing a product"""
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    sku = models.CharField(max_length=50, unique=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    min_installments = models.PositiveIntegerField(default=1)
    max_installments = models.PositiveIntegerField(default=12)

    def __str__(self):
        return f"{self.name} - ${self.price}"

    class Meta:
        ordering = ['-created_at']
