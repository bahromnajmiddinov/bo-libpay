from django.urls import path
from . import views

urlpatterns = [
    path('sellers/', views.SellerListCreateView.as_view(), name='seller-list-create'),
    path('sellers/<int:pk>/', views.SellerDetailView.as_view(), name='seller-detail'),
    path('register/', views.register_seller, name='register-seller'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
]
