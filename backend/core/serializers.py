from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Seller


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class SellerSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    
    class Meta:
        model = Seller
        fields = ['id', 'user', 'business_name', 'business_address', 'phone_number', 'email', 'tax_id', 'created_at']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = User.objects.create_user(**user_data)
        seller = Seller.objects.create(user=user, **validated_data)
        return seller

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
