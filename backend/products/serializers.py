from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['created_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.business_name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'category', 'category_name', 'seller_name',
            'name', 'description', 'price', 'image', 'sku', 'stock_quantity',
            'is_active', 'min_installments', 'max_installments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'seller']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative")
        return value

    def validate_installments(self, data):
        min_installments = data.get('min_installments', 1)
        max_installments = data.get('max_installments', 12)
        
        if min_installments > max_installments:
            raise serializers.ValidationError("Minimum installments cannot be greater than maximum installments")
        
        return data
