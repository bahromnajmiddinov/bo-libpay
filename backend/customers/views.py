from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['email']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['-created_at']


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_orders(request, customer_id):
    """Get all orders for a specific customer"""
    from orders.models import Order
    from orders.serializers import OrderSerializer
    
    try:
        customer = Customer.objects.get(id=customer_id)
        orders = Order.objects.filter(customer=customer)
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    except Customer.DoesNotExist:
        return Response({
            'error': 'Customer not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_stats(request):
    """Get customer statistics"""
    from core.models import Seller
    from orders.models import Order
    
    try:
        seller = Seller.objects.get(user=request.user)
        orders = Order.objects.filter(product__seller=seller)
        customers = Customer.objects.filter(orders__in=orders).distinct()
        
        total_customers = customers.count()
        active_customers = customers.filter(
            orders__status__in=['approved', 'active']
        ).distinct().count()
        
        return Response({
            'total_customers': total_customers,
            'active_customers': active_customers,
        })
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)