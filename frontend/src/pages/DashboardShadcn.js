import React from 'react';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  AlertTriangle,
  Calendar,
  CreditCard,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardShadcn = () => {
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    orderService.getDashboardStats,
    {
      refetchInterval: 30000,
    }
  );

  const { data: dueData, isLoading: dueLoading } = useQuery(
    'dueInstallments',
    orderService.getDueInstallments,
    {
      refetchInterval: 30000,
    }
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (statsLoading || dueLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statsData = stats || {};
  const dueInstallments = dueData || { due_today: [], overdue: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Orders
          </Button>
          <Button size="sm" onClick={() => navigate('/reports')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.orders?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.orders?.active || 0} active orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statsData.payments?.total_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {statsData.orders?.total || 0} orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statsData.installments?.outstanding_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From pending installments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.customers?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsData.customers?.active || 0} with active orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Alerts */}
      {(dueInstallments.due_today?.length > 0 || dueInstallments.overdue?.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Payment Alerts</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              Payments that require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dueInstallments.due_today?.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {dueInstallments.due_today.length} payments due today
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              )}
              {dueInstallments.overdue?.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      {dueInstallments.overdue.length} overdue payments
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statsData.orders?.total > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">New orders this week</p>
                      <p className="text-xs text-muted-foreground">
                        Keep track of your latest sales
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {statsData.orders?.pending || 0} pending
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/orders')}>
                    View All Orders
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                  <Button className="mt-4" onClick={() => navigate('/orders')}>
                    Create First Order
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Current payment status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {statsData.installments?.paid || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {statsData.installments?.due_today || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {statsData.installments?.overdue || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/reports')}>
                <CreditCard className="mr-2 h-4 w-4" />
                View Payment Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/orders')}>
              <ShoppingCart className="h-6 w-6 mb-2" />
              <span>New Order</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/customers')}>
              <Users className="h-6 w-6 mb-2" />
              <span>Add Customer</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/products')}>
              <ShoppingCart className="h-6 w-6 mb-2" />
              <span>Add Product</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/reports')}>
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardShadcn;
