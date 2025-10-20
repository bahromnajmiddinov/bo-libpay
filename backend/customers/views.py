from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    queryset = Customer.objects.none()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['email']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    ordering_fields = ['first_name', 'last_name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        # During schema generation (swagger_fake_view) or for anonymous users
        # accessing `.request.user.organization` will raise — return an
        # empty queryset so the schema generator can inspect the view safely.
        if getattr(self, 'swagger_fake_view', False):
            return Customer.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Customer.objects.none()

        # Scope customers to the user's organization
        return Customer.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        # Set organization automatically on create. During schema generation
        # there may be no authenticated user, so guard accordingly.
        user = getattr(self.request, 'user', None)
        org = None
        if user is not None and not getattr(user, 'is_anonymous', True):
            org = getattr(user, 'organization', None)
        serializer.save(organization=org)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    queryset = Customer.objects.none()

    def get_queryset(self):
        # During schema generation or for anonymous users return empty
        if getattr(self, 'swagger_fake_view', False):
            return Customer.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Customer.objects.none()

        # Only allow access to customers within the user's organization
        return Customer.objects.filter(organization=user.organization)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_orders(request, customer_id):
    """Get all orders for a specific customer"""
    from orders.models import Order
    from orders.serializers import OrderSerializer
    
    # Guard access to request.user for schema generation
    user = getattr(request, 'user', None)
    if user is None or getattr(user, 'is_anonymous', True):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        customer = Customer.objects.get(id=customer_id, organization=user.organization)
        orders = Order.objects.filter(customer=customer, organization=user.organization)
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