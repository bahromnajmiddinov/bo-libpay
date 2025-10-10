from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Installment, PaymentReminder


@shared_task
def send_payment_reminders():
    """Send payment reminders for due and overdue installments"""
    today = timezone.now().date()
    
    # Find installments due today
    due_today = Installment.objects.filter(
        due_date=today,
        status='pending'
    )
    
    # Find overdue installments (more than 1 day late)
    overdue = Installment.objects.filter(
        due_date__lt=today,
        status='pending'
    )
    
    reminders_sent = 0
    
    # Send reminders for due today
    for installment in due_today:
        send_reminder_email(installment, 'due_today')
        create_in_app_reminder(installment, 'due_today')
        reminders_sent += 1
    
    # Send reminders for overdue
    for installment in overdue:
        send_reminder_email(installment, 'overdue')
        create_in_app_reminder(installment, 'overdue')
        reminders_sent += 1
    
    return f"Sent {reminders_sent} payment reminders"


def send_reminder_email(installment, reminder_type):
    """Send email reminder for installment"""
    try:
        customer = installment.order.customer
        
        if reminder_type == 'due_today':
            subject = f"Payment Due Today - Order #{installment.order.id}"
            message = f"""
Dear {customer.full_name},

This is a friendly reminder that your payment of ${installment.amount} is due today for Order #{installment.order.id}.

Installment Details:
- Installment #{installment.installment_number}
- Amount: ${installment.amount}
- Due Date: {installment.due_date}
- Product: {installment.order.product.name}

Please make your payment as soon as possible to avoid any late fees.

Thank you for your business!

Best regards,
{installment.order.product.seller.business_name}
            """
        else:  # overdue
            subject = f"Overdue Payment - Order #{installment.order.id}"
            message = f"""
Dear {customer.full_name},

Your payment of ${installment.amount} for Order #{installment.order.id} is now overdue.

Installment Details:
- Installment #{installment.installment_number}
- Amount: ${installment.amount}
- Due Date: {installment.due_date}
- Days Overdue: {(timezone.now().date() - installment.due_date).days}
- Product: {installment.order.product.name}

Please make your payment immediately to avoid additional late fees and to maintain your account in good standing.

Thank you for your immediate attention to this matter.

Best regards,
{installment.order.product.seller.business_name}
            """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [customer.email],
            fail_silently=False,
        )
        
        # Create reminder record
        PaymentReminder.objects.create(
            installment=installment,
            reminder_type='email',
            scheduled_date=timezone.now(),
            sent_date=timezone.now(),
            status='sent',
            message=message
        )
        
    except Exception as e:
        # Create failed reminder record
        PaymentReminder.objects.create(
            installment=installment,
            reminder_type='email',
            scheduled_date=timezone.now(),
            status='failed',
            message=f"Failed to send email: {str(e)}"
        )
        raise e


def create_in_app_reminder(installment, reminder_type):
    """Create in-app notification reminder"""
    try:
        if reminder_type == 'due_today':
            message = f"Payment of ${installment.amount} is due today for Order #{installment.order.id}"
        else:  # overdue
            days_overdue = (timezone.now().date() - installment.due_date).days
            message = f"Payment of ${installment.amount} is {days_overdue} days overdue for Order #{installment.order.id}"
        
        PaymentReminder.objects.create(
            installment=installment,
            reminder_type='in_app',
            scheduled_date=timezone.now(),
            sent_date=timezone.now(),
            status='sent',
            message=message
        )
        
    except Exception as e:
        PaymentReminder.objects.create(
            installment=installment,
            reminder_type='in_app',
            scheduled_date=timezone.now(),
            status='failed',
            message=f"Failed to create in-app reminder: {str(e)}"
        )


@shared_task
def generate_installments_for_order(order_id):
    """Generate installments for a new order"""
    from .models import Order
    
    try:
        order = Order.objects.get(id=order_id)
        
        # Clear existing installments
        order.installments.all().delete()
        
        # Calculate monthly payment
        remaining_amount = order.total_amount - order.down_payment
        monthly_payment = remaining_amount / order.installment_count
        
        # Generate installments
        for i in range(1, order.installment_count + 1):
            due_date = order.start_date + timedelta(days=30 * i)
            Installment.objects.create(
                order=order,
                installment_number=i,
                amount=monthly_payment,
                due_date=due_date,
                status='pending'
            )
        
        return f"Generated {order.installment_count} installments for Order #{order_id}"
        
    except Order.DoesNotExist:
        return f"Order #{order_id} not found"
    except Exception as e:
        return f"Error generating installments: {str(e)}"
