from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        # Sellers can only see their own products
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Product.objects.filter(seller=seller)
        except Seller.DoesNotExist:
            return Product.objects.none()

    def perform_create(self, serializer):
        from core.models import Seller
        seller = Seller.objects.get(user=self.request.user)
        serializer.save(seller=seller)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from core.models import Seller
        try:
            seller = Seller.objects.get(user=self.request.user)
            return Product.objects.filter(seller=seller)
        except Seller.DoesNotExist:
            return Product.objects.none()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_stats(request):
    """Get product statistics for the seller"""
    from core.models import Seller
    from orders.models import Order
    
    try:
        seller = Seller.objects.get(user=request.user)
        products = Product.objects.filter(seller=seller)
        
        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        total_orders = Order.objects.filter(product__seller=seller).count()
        pending_orders = Order.objects.filter(
            product__seller=seller,
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