from django.contrib import admin
from .models import Order, Installment, Payment, PaymentReminder


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0
    readonly_fields = ['status', 'paid_date']


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ['payment_date', 'created_by']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'product', 'total_amount', 'status', 'order_date']
    list_filter = ['status', 'order_date', 'product__seller']
    search_fields = ['customer__first_name', 'customer__last_name', 'product__name']
    readonly_fields = ['order_date', 'approved_date', 'monthly_payment']
    inlines = [InstallmentInline, PaymentInline]
    fieldsets = (
        ('Order Information', {
            'fields': ('customer', 'product', 'quantity', 'status')
        }),
        ('Payment Details', {
            'fields': ('total_amount', 'down_payment', 'installment_count', 'monthly_payment')
        }),
        ('Dates', {
            'fields': ('order_date', 'approved_date', 'start_date')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
    )


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ['installment_number', 'order', 'amount', 'due_date', 'status']
    list_filter = ['status', 'due_date', 'order__product__seller']
    search_fields = ['order__customer__first_name', 'order__customer__last_name']
    readonly_fields = ['status', 'paid_date']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['order', 'amount', 'payment_method', 'payment_date', 'created_by']
    list_filter = ['payment_method', 'payment_date', 'order__product__seller']
    search_fields = ['order__customer__first_name', 'order__customer__last_name', 'reference_number']
    readonly_fields = ['payment_date', 'created_by']


@admin.register(PaymentReminder)
class PaymentReminderAdmin(admin.ModelAdmin):
    list_display = ['installment', 'reminder_type', 'status', 'scheduled_date', 'sent_date']
    list_filter = ['reminder_type', 'status', 'scheduled_date']
    search_fields = ['installment__order__customer__first_name', 'installment__order__customer__last_name']
    readonly_fields = ['created_at']