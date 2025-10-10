from django.urls import path
from . import views

urlpatterns = [
    path('', views.CustomerListCreateView.as_view(), name='customer-list-create'),
    path('<int:pk>/', views.CustomerDetailView.as_view(), name='customer-detail'),
    path('<int:customer_id>/orders/', views.customer_orders, name='customer-orders'),
    path('stats/', views.customer_stats, name='customer-stats'),
]
