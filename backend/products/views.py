from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.none()

    def get_queryset(self):
        # Only return categories for the user's organization
        if getattr(self, 'swagger_fake_view', False):
            return Category.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Category.objects.none()

        org = user.organization
        return Category.objects.filter(organization=org)

    def perform_create(self, serializer):
        # During schema generation there may be no authenticated user.
        user = getattr(self.request, 'user', None)
        org = None
        if user is not None and not getattr(user, 'is_anonymous', True):
            org = getattr(user, 'organization', None)
        serializer.save(organization=org)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Category.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Category.objects.none()

        org = user.organization
        return Category.objects.filter(organization=org)


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.none()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        # Sellers can only see their own products
        if getattr(self, 'swagger_fake_view', False):
            return Product.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Product.objects.none()

        from core.models import Seller
        try:
            seller = Seller.objects.get(user=user)
        except Seller.DoesNotExist:
            return Product.objects.none()

        org = getattr(user, 'organization', None)
        return Product.objects.filter(organization=org)

    def perform_create(self, serializer):
        from core.models import Seller
        # Set organization and seller on create
        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            # Allow schema generation without raising
            serializer.save(seller=None, organization=None)
            return

        seller = Seller.objects.get(user=user)
        serializer.save(seller=seller, organization=getattr(user, 'organization', None))


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.none()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Product.objects.none()

        user = getattr(self.request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Product.objects.none()

        org = user.organization
        return Product.objects.filter(organization=org)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_stats(request):
    """Get product statistics for the seller"""
    from core.models import Seller
    from orders.models import Order
    
    try:
        # request.user may be Anonymous during schema generation
        user = getattr(request, 'user', None)
        if user is None or getattr(user, 'is_anonymous', True):
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        org = user.organization
        products = Product.objects.filter(organization=org)

        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        total_orders = Order.objects.filter(product__organization=org).count()
        pending_orders = Order.objects.filter(
            product__organization=org,
            status='pending'
        ).count()
        
        return Response({
            'total_products': total_products,
            'active_products': active_products,
            'total_orders': total_orders,
            'pending_orders': pending_orders,
        })
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)