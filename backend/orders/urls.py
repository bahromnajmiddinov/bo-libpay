from django.urls import path
from . import views

urlpatterns = [
    path('', views.OrderListCreateView.as_view(), name='order-list-create'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/approve/', views.approve_order, name='approve-order'),
    path('installments/', views.InstallmentListView.as_view(), name='installment-list'),
    path('installments/<int:pk>/', views.InstallmentDetailView.as_view(), name='installment-detail'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list-create'),
    path('payments/<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('payment-reminders/', views.PaymentReminderListCreateView.as_view(), name='payment-reminder-list-create'),
    path('payment-reminders/<int:pk>/', views.PaymentReminderDetailView.as_view(), name='payment-reminder-detail'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('due-installments/', views.due_installments, name='due-installments'),
    path('customers/<int:customer_id>/portal/', views.customer_portal_data, name='customer-portal-data'),
    path('reports/summary/', views.reports_summary, name='reports-summary'),
    path('reports/detailed/', views.detailed_reports, name='detailed-reports'),
]
