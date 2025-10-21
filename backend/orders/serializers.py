from rest_framework import serializers
from decimal import Decimal
from .models import Order, Installment, Payment, PaymentReminder
from products.serializers import ProductSerializer
from customers.serializers import CustomerSerializer


class InstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Installment
        fields = [
            'id', 'installment_number', 'amount', 'due_date',
            'status', 'paid_date'
        ]
        read_only_fields = ['status', 'paid_date']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_method', 'payment_date',
            'reference_number', 'notes', 'created_by'
        ]
        read_only_fields = ['payment_date', 'created_by']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value


class PaymentReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReminder
        fields = [
            'id', 'reminder_type', 'scheduled_date', 'sent_date',
            'status', 'message', 'created_at'
        ]
        read_only_fields = ['created_at']


class OrderSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    product = ProductSerializer(read_only=True)
    customer_id = serializers.IntegerField(write_only=True)
    product_id = serializers.IntegerField(write_only=True)
    installments = InstallmentSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    remaining_balance = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_id', 'product', 'product_id',
            'quantity', 'total_amount', 'down_payment', 'installment_count',
            'monthly_payment', 'status', 'order_date', 'approved_date',
            'start_date', 'notes', 'remaining_balance', 'is_overdue',
            'installments', 'payments'
        ]
        read_only_fields = [
            'order_date', 'approved_date', 'monthly_payment',
            'remaining_balance', 'is_overdue'
        ]

    def validate_total_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Total amount must be greater than 0")
        return value

    def validate_down_payment(self, value):
        if value < 0:
            raise serializers.ValidationError("Down payment cannot be negative")
        return value

    def validate_installment_count(self, value):
        if value < 1:
            raise serializers.ValidationError("Installment count must be at least 1")
        return value

    def validate(self, data):
        total_amount = data.get('total_amount', 0)
        down_payment = data.get('down_payment', 0)
        
        if down_payment >= total_amount:
            raise serializers.ValidationError("Down payment cannot be greater than or equal to total amount")
        
        return data

    def create(self, validated_data):
        # Calculate monthly payment
        remaining_amount = validated_data['total_amount'] - validated_data['down_payment']
        monthly_payment = remaining_amount / validated_data['installment_count']
        validated_data['monthly_payment'] = monthly_payment
        
        order = Order.objects.create(**validated_data)
        
        # Generate installments asynchronously. If the Celery broker (Redis)
        # is unavailable, do not fail the HTTP request — log and continue.
        from .tasks import generate_installments_for_order
        try:
            generate_installments_for_order.delay(order.id)
        except Exception as exc:
            # Avoid importing logging configuration changes; use print as a
            # minimal fallback so the error is visible in logs during dev.
            print(f"Warning: could not queue generate_installments_for_order task: {exc}")
        
        return order


class OrderCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating orders"""
    class Meta:
        model = Order
        fields = [
            'customer', 'product', 'quantity', 'total_amount',
            'down_payment', 'installment_count', 'notes'
        ]

    def create(self, validated_data):
        # Calculate monthly payment
        remaining_amount = validated_data['total_amount'] - validated_data['down_payment']
        monthly_payment = remaining_amount / validated_data['installment_count']
        validated_data['monthly_payment'] = monthly_payment
        
        order = Order.objects.create(**validated_data)
        
        # Generate installments asynchronously
        from .tasks import generate_installments_for_order
        try:
            generate_installments_for_order.delay(order.id)
        except Exception as exc:
            print(f"Warning: could not queue generate_installments_for_order task: {exc}")
        
        return order
