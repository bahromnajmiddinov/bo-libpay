from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False, allow_null=True)
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'user', 'first_name', 'last_name', 'full_name',
            'email', 'phone_number', 'address', 'date_of_birth',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = User.objects.create_user(**user_data)
            validated_data['user'] = user
        customer = Customer.objects.create(**validated_data)
        return customer

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data and instance.user:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
        elif user_data and not instance.user:
            user = User.objects.create_user(**user_data)
            instance.user = user
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
