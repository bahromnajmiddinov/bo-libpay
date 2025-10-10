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


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'product']
    search_fields = ['customer__first_name', 'customer__last_name', 'product__name']
    ordering_fields = ['order_date', 'total_amount', 'status']
    ordering = ['-order_date']

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Order.objects.filter(product__seller=seller)
        except Seller.DoesNotExist:
            return Order.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderSerializer


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Order.objects.filter(product__seller=seller)
        except Seller.DoesNotExist:
            return Order.objects.none()


class InstallmentListView(generics.ListAPIView):
    serializer_class = InstallmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'due_date']
    ordering_fields = ['due_date', 'amount', 'installment_number']
    ordering = ['due_date']

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Installment.objects.filter(order__product__seller=seller)
        except Seller.DoesNotExist:
            return Installment.objects.none()


class InstallmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InstallmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Installment.objects.filter(order__product__seller=seller)
        except Seller.DoesNotExist:
            return Installment.objects.none()


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payment_method', 'order']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Payment.objects.filter(order__product__seller=seller)
        except Seller.DoesNotExist:
            return Payment.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Payment.objects.filter(order__product__seller=seller)
        except Seller.DoesNotExist:
            return Payment.objects.none()


class PaymentReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['reminder_type', 'is_sent']
    ordering_fields = ['created_at', 'scheduled_date']
    ordering = ['-created_at']

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return PaymentReminder.objects.filter(installment__order__product__seller=seller)
        except Seller.DoesNotExist:
            return PaymentReminder.objects.none()


class PaymentReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return PaymentReminder.objects.filter(installment__order__product__seller=seller)
        except Seller.DoesNotExist:
            return PaymentReminder.objects.none()


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for sellers"""
    from core.models import Seller
    
    try:
        seller = Seller.objects.get(user=request.user)
        
        # Today's date
        today = timezone.now().date()
        
        # Orders
        total_orders = Order.objects.filter(product__seller=seller).count()
        pending_orders = Order.objects.filter(
            product__seller=seller,
            status='pending'
        ).count()
        active_orders = Order.objects.filter(
            product__seller=seller,
            status__in=['approved', 'active']
        ).count()
        
        # Payments
        total_revenue = Payment.objects.filter(
            order__product__seller=seller
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Installments
        due_today = Installment.objects.filter(
            order__product__seller=seller,
            due_date=today,
            status='pending'
        ).count()
        
        overdue = Installment.objects.filter(
            order__product__seller=seller,
            due_date__lt=today,
            status='pending'
        ).count()
        
        # Outstanding balance
        outstanding_balance = Installment.objects.filter(
            order__product__seller=seller,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def due_installments(request):
    """Get installments due today and overdue"""
    from core.models import Seller
    
    try:
        seller = Seller.objects.get(user=request.user)
        today = timezone.now().date()
        
        due_today = Installment.objects.filter(
            order__product__seller=seller,
            due_date=today,
            status='pending'
        )
        
        overdue = Installment.objects.filter(
            order__product__seller=seller,
            due_date__lt=today,
            status='pending'
        )
        
        due_today_serializer = InstallmentSerializer(due_today, many=True)
        overdue_serializer = InstallmentSerializer(overdue, many=True)
        
        return Response({
            'due_today': due_today_serializer.data,
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_summary(request):
    """Get comprehensive reports summary"""
    from core.models import Seller
    from django.db.models import Count, Sum, Avg, Q
    from datetime import datetime, timedelta
    
    try:
        seller = Seller.objects.get(user=request.user)
        today = timezone.now().date()
        
        # Date ranges
        last_30_days = today - timedelta(days=30)
        last_90_days = today - timedelta(days=90)
        last_year = today - timedelta(days=365)
        
        # Orders summary
        total_orders = Order.objects.filter(product__seller=seller).count()
        pending_orders = Order.objects.filter(product__seller=seller, status='pending').count()
        active_orders = Order.objects.filter(product__seller=seller, status__in=['approved', 'active']).count()
        completed_orders = Order.objects.filter(product__seller=seller, status='completed').count()
        
        # Revenue summary
        total_revenue = Payment.objects.filter(order__product__seller=seller).aggregate(
            total=Sum('amount'))['total'] or 0
        last_30_revenue = Payment.objects.filter(
            order__product__seller=seller,
            payment_date__gte=last_30_days
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Outstanding balances
        outstanding_balance = Installment.objects.filter(
            order__product__seller=seller,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Payment status breakdown
        due_today = Installment.objects.filter(
            order__product__seller=seller,
            due_date=today,
            status='pending'
        ).count()
        
        overdue = Installment.objects.filter(
            order__product__seller=seller,
            due_date__lt=today,
            status='pending'
        ).count()
        
        paid_installments = Installment.objects.filter(
            order__product__seller=seller,
            status='paid'
        ).count()
        
        # Customer analytics
        total_customers = Order.objects.filter(product__seller=seller).values('customer').distinct().count()
        active_customers = Order.objects.filter(
            product__seller=seller,
            status__in=['approved', 'active']
        ).values('customer').distinct().count()
        
        # Product performance
        product_stats = Order.objects.filter(product__seller=seller).values('product__name').annotate(
            order_count=Count('id'),
            total_revenue=Sum('total_amount')
        ).order_by('-total_revenue')[:5]
        
        # Monthly trends (last 12 months)
        monthly_data = []
        for i in range(12):
            month_start = today.replace(day=1) - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=30)
            
            monthly_revenue = Payment.objects.filter(
                order__product__seller=seller,
                payment_date__gte=month_start,
                payment_date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_orders = Order.objects.filter(
                product__seller=seller,
                order_date__gte=month_start,
                order_date__lt=month_end
            ).count()
            
            monthly_data.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(monthly_revenue),
                'orders': monthly_orders
            })
        
        monthly_data.reverse()
        
        # Payment method breakdown
        payment_methods = Payment.objects.filter(
            order__product__seller=seller
        ).values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        return Response({
            'summary': {
                'orders': {
                    'total': total_orders,
                    'pending': pending_orders,
                    'active': active_orders,
                    'completed': completed_orders
                },
                'revenue': {
                    'total': float(total_revenue),
                    'last_30_days': float(last_30_revenue),
                    'outstanding': float(outstanding_balance)
                },
                'customers': {
                    'total': total_customers,
                    'active': active_customers
                },
                'installments': {
                    'due_today': due_today,
                    'overdue': overdue,
                    'paid': paid_installments
                }
            },
            'product_performance': list(product_stats),
            'monthly_trends': monthly_data,
            'payment_methods': list(payment_methods)
        })
        
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detailed_reports(request):
    """Get detailed reports with filters"""
    from core.models import Seller
    from django.db.models import Q
    from datetime import datetime, timedelta
    
    try:
        seller = Seller.objects.get(user=request.user)
        
        # Get query parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        customer_id = request.GET.get('customer_id')
        product_id = request.GET.get('product_id')
        status = request.GET.get('status')
        report_type = request.GET.get('type', 'all')
        
        # Build filters
        filters = {'product__seller': seller}
        
        if start_date:
            filters['order_date__gte'] = start_date
        if end_date:
            filters['order_date__lte'] = end_date
        if customer_id:
            filters['customer_id'] = customer_id
        if product_id:
            filters['product_id'] = product_id
        if status:
            filters['status'] = status
        
        # Get filtered data based on report type
        if report_type == 'orders':
            orders = Order.objects.filter(**filters).select_related('customer', 'product')
            serializer = OrderSerializer(orders, many=True)
            return Response({'orders': serializer.data})
            
        elif report_type == 'payments':
            payments = Payment.objects.filter(order__product__seller=seller)
            if start_date:
                payments = payments.filter(payment_date__gte=start_date)
            if end_date:
                payments = payments.filter(payment_date__lte=end_date)
            if customer_id:
                payments = payments.filter(order__customer_id=customer_id)
            if product_id:
                payments = payments.filter(order__product_id=product_id)
                
            payments = payments.select_related('order__customer', 'order__product')
            serializer = PaymentSerializer(payments, many=True)
            return Response({'payments': serializer.data})
            
        elif report_type == 'installments':
            installments = Installment.objects.filter(order__product__seller=seller)
            if start_date:
                installments = installments.filter(due_date__gte=start_date)
            if end_date:
                installments = installments.filter(due_date__lte=end_date)
            if customer_id:
                installments = installments.filter(order__customer_id=customer_id)
            if product_id:
                installments = installments.filter(order__product_id=product_id)
                
            installments = installments.select_related('order__customer', 'order__product')
            serializer = InstallmentSerializer(installments, many=True)
            return Response({'installments': serializer.data})
            
        else:  # all
            orders = Order.objects.filter(**filters).select_related('customer', 'product')
            payments = Payment.objects.filter(order__product__seller=seller)
            installments = Installment.objects.filter(order__product__seller=seller)
            
            if start_date:
                payments = payments.filter(payment_date__gte=start_date)
                installments = installments.filter(due_date__gte=start_date)
            if end_date:
                payments = payments.filter(payment_date__lte=end_date)
                installments = installments.filter(due_date__lte=end_date)
            if customer_id:
                payments = payments.filter(order__customer_id=customer_id)
                installments = installments.filter(order__customer_id=customer_id)
            if product_id:
                payments = payments.filter(order__product_id=product_id)
                installments = installments.filter(order__product_id=product_id)
            
            orders_serializer = OrderSerializer(orders, many=True)
            payments_serializer = PaymentSerializer(payments.select_related('order__customer', 'order__product'), many=True)
            installments_serializer = InstallmentSerializer(installments.select_related('order__customer', 'order__product'), many=True)
            
            return Response({
                'orders': orders_serializer.data,
                'payments': payments_serializer.data,
                'installments': installments_serializer.data
            })
        
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)