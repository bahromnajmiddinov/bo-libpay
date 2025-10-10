from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from products.models import Product
from customers.models import Customer


class Order(models.Model):
    """Model representing an order"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    down_payment = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    installment_count = models.PositiveIntegerField()
    monthly_payment = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order_date = models.DateTimeField(auto_now_add=True)
    approved_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Order #{self.id} - {self.customer.full_name} - {self.product.name}"

    @property
    def remaining_balance(self):
        total_paid = sum(payment.amount for payment in self.payments.all())
        return self.total_amount - self.down_payment - total_paid

    @property
    def is_overdue(self):
        overdue_installments = self.installments.filter(
            due_date__lt=timezone.now().date(),
            status='pending'
        ).exists()
        return overdue_installments

    class Meta:
        ordering = ['-order_date']


class Installment(models.Model):
    """Model representing an installment"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='installments')
    installment_number = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Installment {self.installment_number} - Order #{self.order.id} - ${self.amount}"

    def save(self, *args, **kwargs):
        # Auto-update status based on due date
        if self.status == 'pending' and self.due_date < timezone.now().date():
            self.status = 'overdue'
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['installment_number']
        unique_together = ['order', 'installment_number']


class Payment(models.Model):
    """Model representing a payment"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
        ('other', 'Other'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    installment = models.ForeignKey(Installment, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateTimeField(default=timezone.now)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Payment - Order #{self.order.id} - ${self.amount}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update installment status if payment is made
        if self.installment and self.amount >= self.installment.amount:
            self.installment.status = 'paid'
            self.installment.paid_date = self.payment_date.date()
            self.installment.save()

    class Meta:
        ordering = ['-payment_date']


class PaymentReminder(models.Model):
    """Model representing payment reminders"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    REMINDER_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('in_app', 'In-App Notification'),
    ]

    installment = models.ForeignKey(Installment, on_delete=models.CASCADE, related_name='reminders')
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    scheduled_date = models.DateTimeField()
    sent_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reminder - {self.installment} - {self.reminder_type}"

    class Meta:
        ordering = ['-scheduled_date']