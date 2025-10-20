from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Sum
from datetime import datetime, timedelta
from .models import Order, Installment, Payment, PaymentReminder
from .serializers import (
    OrderSerializer, OrderCreateSerializer, InstallmentSerializer,
    PaymentSerializer, PaymentReminderSerializer
)
try:
    # Optional import for API documentation
    from drf_spectacular.utils import extend_schema, OpenApiParameter
except Exception:
    def extend_schema(*a, **k):
        def _decorator(f):
            return f
        return _decorator
    class OpenApiParameter:
        def __init__(self, *a, **k):
            pass


def parse_date_range(range_key: str = None, start_date: str = None, end_date: str = None):
    """Return (start_date, end_date) date objects for given range_key or explicit dates.

    Supported range_key values: today, yesterday, last_7, last_30, last_90, last_year, this_month, last_month
    If start_date/end_date provided (ISO YYYY-MM-DD) they take precedence.
    """
    today = timezone.now().date()
    if start_date and end_date:
        try:
            sd = datetime.fromisoformat(start_date).date()
            ed = datetime.fromisoformat(end_date).date()
            return sd, ed
        except Exception:
            return None, None

    if not range_key:
        return None, None

    key = (range_key or '').lower()
    if key in ('today',):
        return today, today
    if key in ('yesterday', 'yesterdan'):
        y = today - timedelta(days=1)
        return y, y
    if key in ('last_7', 'last7', '7days'):
        sd = today - timedelta(days=6)
        return sd, today
    if key in ('last_30', 'last30', '30days'):
        sd = today - timedelta(days=29)
        return sd, today
    if key in ('last_90', 'last90', '90days'):
        sd = today - timedelta(days=89)
        return sd, today
    if key in ('last_year', 'lastyear', '365days'):
        sd = today - timedelta(days=365)
        return sd, today
    if key in ('this_month', 'month'):
        sd = today.replace(day=1)
        return sd, today
    if key in ('last_month',):
        first_of_this = today.replace(day=1)
        last_month_end = first_of_this - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        return last_month_start, last_month_end

    return None, None


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'product']
    search_fields = ['customer__first_name', 'customer__last_name', 'product__name']
    ordering_fields = ['order_date', 'total_amount', 'status']
    ordering = ['-order_date']
    queryset = Order.objects.none()

    def get_queryset(self):
        # Allow schema generation without authenticated user
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Order.objects.none()

        org = getattr(user, 'organization', None)
        return Order.objects.filter(organization=org)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        # Ensure organization and created_by are set on new orders
        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            serializer.save(created_by=None, organization=None)
            return

        serializer.save(created_by=user, organization=getattr(user, 'organization', None))


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Order.objects.none()

        org = getattr(user, 'organization', None)
        return Order.objects.filter(organization=org)


class InstallmentListView(generics.ListAPIView):
    serializer_class = InstallmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'due_date']
    ordering_fields = ['due_date', 'amount', 'installment_number']
    ordering = ['due_date']
    queryset = Installment.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Installment.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Installment.objects.none()

        org = getattr(user, 'organization', None)
        return Installment.objects.filter(organization=org)


class InstallmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InstallmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Installment.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Installment.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Installment.objects.none()

        org = getattr(user, 'organization', None)
        return Installment.objects.filter(organization=org)


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payment_method', 'order']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']
    queryset = Payment.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Payment.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Payment.objects.none()

        org = getattr(user, 'organization', None)
        return Payment.objects.filter(organization=org)

    def perform_create(self, serializer):
        # Set organization on created payment from the requesting user's organization
        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            serializer.save(created_by=None, organization=None)
            return

        serializer.save(created_by=user, organization=getattr(user, 'organization', None))


class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Payment.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Payment.objects.none()

        org = getattr(user, 'organization', None)
        return Payment.objects.filter(organization=org)


class PaymentReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    # Use actual model fields; 'is_sent' does not exist on PaymentReminder
    filterset_fields = ['reminder_type', 'status', 'scheduled_date', 'sent_date']
    ordering_fields = ['created_at', 'scheduled_date']
    ordering = ['-created_at']
    queryset = PaymentReminder.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PaymentReminder.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return PaymentReminder.objects.none()

        org = getattr(user, 'organization', None)
        return PaymentReminder.objects.filter(organization=org)


class PaymentReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]
    queryset = PaymentReminder.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PaymentReminder.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return PaymentReminder.objects.none()

        org = getattr(user, 'organization', None)
        return PaymentReminder.objects.filter(organization=org)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_order(request, order_id):
    """Approve an order and generate installments"""
    from core.models import Seller
    
    try:
        seller = Seller.objects.get(user=request.user)
        order = Order.objects.get(id=order_id, product__seller=seller)
        
        if order.status != 'pending':
            return Response({
                'error': 'Order is not in pending status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'approved'
        order.approved_date = timezone.now()
        order.start_date = timezone.now().date()
        order.save()
        
        # Generate installments
        from .tasks import generate_installments_for_order
        generate_installments_for_order.delay(order.id)
        
        return Response({
            'message': 'Order approved successfully'
        })
        
    except Order.DoesNotExist:
        return Response({
            'error': 'Order not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    parameters=[
        OpenApiParameter('range', description='Date range: today, yesterday, last_7, last_30, last_90, last_year, this_month, last_month', required=False),
        OpenApiParameter('start_date', description='Start date (YYYY-MM-DD) - overrides range if provided', required=False),
        OpenApiParameter('end_date', description='End date (YYYY-MM-DD) - overrides range if provided', required=False),
    ]
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for sellers with optional date range filters"""
    from core.models import Seller

    try:
        seller = Seller.objects.get(user=request.user)

        # parse range params
        range_key = request.GET.get('range')
        start_date_q = request.GET.get('start_date')
        end_date_q = request.GET.get('end_date')
        sd, ed = parse_date_range(range_key, start_date_q, end_date_q)

        # base queryset (organization scoped)
        org = getattr(seller, 'organization', None)

        # Orders - if date filter provided, apply to order_date
        orders_qs = Order.objects.filter(product__seller=seller)
        if sd and ed:
            orders_qs = orders_qs.filter(order_date__date__gte=sd, order_date__date__lte=ed)
        total_orders = orders_qs.count()

        pending_orders = orders_qs.filter(status='pending').count()
        active_orders = orders_qs.filter(status__in=['approved', 'active']).count()

        # Payments
        payments_qs = Payment.objects.filter(order__product__seller=seller)
        if sd and ed:
            payments_qs = payments_qs.filter(payment_date__date__gte=sd, payment_date__date__lte=ed)
        total_revenue = payments_qs.aggregate(total=Sum('amount'))['total'] or 0

        # Installments
        installments_qs = Installment.objects.filter(order__product__seller=seller)
        if sd and ed:
            installments_qs = installments_qs.filter(due_date__gte=sd, due_date__lte=ed)

        # due today / overdue are relative to today (not to the provided range)
        today = timezone.now().date()
        due_today = installments_qs.filter(due_date=today, status='pending').count()
        overdue = installments_qs.filter(due_date__lt=today, status='pending').count()

        # Outstanding balance
        outstanding_balance = installments_qs.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'orders': {
                'total': total_orders,
                'pending': pending_orders,
                'active': active_orders,
            },
            'payments': {
                'total_revenue': float(total_revenue),
            },
            'installments': {
                'due_today': due_today,
                'overdue': overdue,
                'outstanding_balance': float(outstanding_balance),
            }
        })

    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    parameters=[
        OpenApiParameter('range', description='Date range: today, yesterday, last_7, last_30, last_90, last_year, this_month, last_month', required=False),
        OpenApiParameter('start_date', description='Start date (YYYY-MM-DD) - overrides range if provided', required=False),
        OpenApiParameter('end_date', description='End date (YYYY-MM-DD) - overrides range if provided', required=False),
    ]
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def due_installments(request):
    """Get installments due in a date range (default: today) and overdue"""
    from core.models import Seller

    try:
        seller = Seller.objects.get(user=request.user)

        range_key = request.GET.get('range')
        sd, ed = parse_date_range(range_key, request.GET.get('start_date'), request.GET.get('end_date'))

        today = timezone.now().date()

        if sd and ed:
            due_qs = Installment.objects.filter(order__product__seller=seller, due_date__gte=sd, due_date__lte=ed, status='pending')
            overdue_qs = Installment.objects.filter(order__product__seller=seller, due_date__lt=sd, status='pending')
        else:
            due_qs = Installment.objects.filter(order__product__seller=seller, due_date=today, status='pending')
            overdue_qs = Installment.objects.filter(order__product__seller=seller, due_date__lt=today, status='pending')

        due_today_serializer = InstallmentSerializer(due_qs, many=True)
        overdue_serializer = InstallmentSerializer(overdue_qs, many=True)

        return Response({
            'due': due_today_serializer.data,
            'overdue': overdue_serializer.data,
        })

    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_portal_data(request, customer_id):
    """Get data for customer portal"""
    from core.models import Seller
    
    try:
        seller = Seller.objects.get(user=request.user)
        
        # Get customer orders
        orders = Order.objects.filter(
            customer_id=customer_id,
            product__seller=seller
        )
        
        # Get all installments for these orders
        installments = Installment.objects.filter(order__in=orders)
        
        # Get payments
        payments = Payment.objects.filter(order__in=orders)
        
        orders_serializer = OrderSerializer(orders, many=True)
        installments_serializer = InstallmentSerializer(installments, many=True)
        payments_serializer = PaymentSerializer(payments, many=True)
        
        return Response({
            'orders': orders_serializer.data,
            'installments': installments_serializer.data,
            'payments': payments_serializer.data,
        })
        
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    parameters=[
        OpenApiParameter('range', description='Date range: today, yesterday, last_7, last_30, last_90, last_year, this_month, last_month', required=False),
        OpenApiParameter('start_date', description='Start date (YYYY-MM-DD) - overrides range if provided', required=False),
        OpenApiParameter('end_date', description='End date (YYYY-MM-DD) - overrides range if provided', required=False),
    ]
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_summary(request):
    """Get comprehensive reports summary with optional date range filters"""
    from core.models import Seller
    from django.db.models import Count, Sum, Avg, Q
    from datetime import datetime, timedelta

    try:
        seller = Seller.objects.get(user=request.user)
        today = timezone.now().date()

        # Parse date range
        range_key = request.GET.get('range')
        sd, ed = parse_date_range(range_key, request.GET.get('start_date'), request.GET.get('end_date'))

        # Orders summary
        orders_qs = Order.objects.filter(product__seller=seller)
        if sd and ed:
            orders_qs = orders_qs.filter(order_date__date__gte=sd, order_date__date__lte=ed)
        total_orders = orders_qs.count()
        pending_orders = orders_qs.filter(status='pending').count()
        active_orders = orders_qs.filter(status__in=['approved', 'active']).count()
        completed_orders = orders_qs.filter(status='completed').count()

        # Revenue summary
        payments_qs = Payment.objects.filter(order__product__seller=seller)
        if sd and ed:
            payments_qs = payments_qs.filter(payment_date__date__gte=sd, payment_date__date__lte=ed)
        total_revenue = payments_qs.aggregate(total=Sum('amount'))['total'] or 0
        last_30_revenue = payments_qs.filter(payment_date__gte=today - timedelta(days=30)).aggregate(total=Sum('amount'))['total'] or 0

        # Outstanding balances
        installments_qs = Installment.objects.filter(order__product__seller=seller)
        if sd and ed:
            installments_qs = installments_qs.filter(due_date__gte=sd, due_date__lte=ed)
        outstanding_balance = installments_qs.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

        # Payment status breakdown
        due_today = Installment.objects.filter(order__product__seller=seller, due_date=today, status='pending').count()
        overdue = Installment.objects.filter(order__product__seller=seller, due_date__lt=today, status='pending').count()
        paid_installments = Installment.objects.filter(order__product__seller=seller, status='paid').count()

        # Customer analytics
        total_customers = Order.objects.filter(product__seller=seller).values('customer').distinct().count()
        active_customers = Order.objects.filter(product__seller=seller, status__in=['approved', 'active']).values('customer').distinct().count()

        # Product performance
        product_stats = Order.objects.filter(product__seller=seller).values('product__name').annotate(order_count=Count('id'), total_revenue=Sum('total_amount')).order_by('-total_revenue')[:5]

        # Monthly trends (last 12 months)
        monthly_data = []
        for i in range(12):
            month_start = today.replace(day=1) - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=30)
            monthly_revenue = payments_qs.filter(payment_date__gte=month_start, payment_date__lt=month_end).aggregate(total=Sum('amount'))['total'] or 0
            monthly_orders = orders_qs.filter(order_date__gte=month_start, order_date__lt=month_end).count()
            monthly_data.append({'month': month_start.strftime('%Y-%m'), 'revenue': float(monthly_revenue), 'orders': monthly_orders})

        monthly_data.reverse()

        # Payment method breakdown
        payment_methods = payments_qs.values('payment_method').annotate(count=Count('id'), total=Sum('amount'))

        return Response({
            'summary': {
                'orders': {'total': total_orders, 'pending': pending_orders, 'active': active_orders, 'completed': completed_orders},
                'revenue': {'total': float(total_revenue), 'last_30_days': float(last_30_revenue), 'outstanding': float(outstanding_balance)},
                'customers': {'total': total_customers, 'active': active_customers},
                'installments': {'due_today': due_today, 'overdue': overdue, 'paid': paid_installments}
            },
            'product_performance': list(product_stats),
            'monthly_trends': monthly_data,
            'payment_methods': list(payment_methods)
        })

    except Seller.DoesNotExist:
        return Response({'error': 'Seller profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detailed_reports(request):
    """Get detailed reports with filters"""
    from core.models import Seller
    from django.db.models import Q
    from datetime import datetime, timedelta
    
    try:
        seller = Seller.objects.get(user=request.user)

        # Query params
        range_key = request.GET.get('range')
        sd, ed = parse_date_range(range_key, request.GET.get('start_date'), request.GET.get('end_date'))
        customer_id = request.GET.get('customer_id')
        product_id = request.GET.get('product_id')
        status_q = request.GET.get('status')
        report_type = request.GET.get('type', 'all')

        # Base filters
        base_orders = Order.objects.filter(product__seller=seller)
        base_payments = Payment.objects.filter(order__product__seller=seller)
        base_installments = Installment.objects.filter(order__product__seller=seller)

        if sd and ed:
            base_orders = base_orders.filter(order_date__date__gte=sd, order_date__date__lte=ed)
            base_payments = base_payments.filter(payment_date__date__gte=sd, payment_date__date__lte=ed)
            base_installments = base_installments.filter(due_date__gte=sd, due_date__lte=ed)

        if customer_id:
            base_orders = base_orders.filter(customer_id=customer_id)
            base_payments = base_payments.filter(order__customer_id=customer_id)
            base_installments = base_installments.filter(order__customer_id=customer_id)

        if product_id:
            base_orders = base_orders.filter(product_id=product_id)
            base_payments = base_payments.filter(order__product_id=product_id)
            base_installments = base_installments.filter(order__product_id=product_id)

        if status_q:
            base_orders = base_orders.filter(status=status_q)

        if report_type == 'orders':
            serializer = OrderSerializer(base_orders.select_related('customer', 'product'), many=True)
            return Response({'orders': serializer.data})

        if report_type == 'payments':
            serializer = PaymentSerializer(base_payments.select_related('order__customer', 'order__product'), many=True)
            return Response({'payments': serializer.data})

        if report_type == 'installments':
            serializer = InstallmentSerializer(base_installments.select_related('order__customer', 'order__product'), many=True)
            return Response({'installments': serializer.data})

        # all
        orders_serializer = OrderSerializer(base_orders.select_related('customer', 'product'), many=True)
        payments_serializer = PaymentSerializer(base_payments.select_related('order__customer', 'order__product'), many=True)
        installments_serializer = InstallmentSerializer(base_installments.select_related('order__customer', 'order__product'), many=True)

        return Response({
            'orders': orders_serializer.data,
            'payments': payments_serializer.data,
            'installments': installments_serializer.data
        })

    except Seller.DoesNotExist:
        return Response({'error': 'Seller profile not found'}, status=status.HTTP_404_NOT_FOUND)