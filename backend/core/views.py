from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Seller
from .serializers import SellerSerializer


class SellerListCreateView(generics.ListCreateAPIView):
    serializer_class = SellerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Seller.objects.filter(user=self.request.user)


class SellerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SellerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Seller.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_seller(request):
    """Register a new seller"""
    serializer = SellerSerializer(data=request.data)
    if serializer.is_valid():
        seller = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(seller.user)
        
        return Response({
            'seller': SellerSerializer(seller).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login for sellers"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user:
        try:
            seller = Seller.objects.get(user=user)
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'seller': SellerSerializer(seller).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        except Seller.DoesNotExist:
            return Response({
                'error': 'User is not a registered seller'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get current seller profile"""
    try:
        seller = Seller.objects.get(user=request.user)
        serializer = SellerSerializer(seller)
        return Response(serializer.data)
    except Seller.DoesNotExist:
        return Response({
            'error': 'Seller profile not found'
        }, status=status.HTTP_404_NOT_FOUND)