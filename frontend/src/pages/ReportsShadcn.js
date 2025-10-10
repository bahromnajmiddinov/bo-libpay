import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  FileText,
  CreditCard,
  PieChart,
  Download,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

const ReportsShadcn = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch reports summary
  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    'reportsSummary',
    orderService.getReportsSummary,
    {
      refetchInterval: 60000,
    }
  );

  // Fetch detailed reports
  const { data: detailedData, isLoading: detailedLoading } = useQuery(
    ['detailedReports', { startDate, endDate, customer_id: selectedCustomer, product_id: selectedProduct, status: selectedStatus, type: reportType }],
    () => orderService.getDetailedReports({
      start_date: startDate,
      end_date: endDate,
      customer_id: selectedCustomer,
      product_id: selectedProduct,
      status: selectedStatus,
      type: reportType
    }),
    {
      enabled: reportType !== 'summary',
    }
  );

  // Fetch products and customers for filters
  const { data: productsData } = useQuery('products', productService.getProducts);
  const { data: customersData } = useQuery('customers', customerService.getCustomers);

  const products = productsData?.results || productsData || [];
  const customers = customersData?.results || customersData || [];

  // Calculate period dates
  const getPeriodDates = (period) => {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    switch (period) {
      case '7':
        start.setDate(today.getDate() - 7);
        break;
      case '30':
        start.setDate(today.getDate() - 30);
        break;
      case '90':
        start.setDate(today.getDate() - 90);
        break;
      case '365':
        start.setDate(today.getDate() - 365);
        break;
      default:
        start.setDate(today.getDate() - 30);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const dates = getPeriodDates(period);
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Generate chart data for monthly trends
  const chartData = useMemo(() => {
    if (!reportsData?.monthly_trends) return null;

    const data = reportsData.monthly_trends.slice(-12); // Last 12 months
    
    return {
      labels: data.map(item => {
        const date = new Date(item.month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      revenue: data.map(item => item.revenue),
      orders: data.map(item => item.orders)
    };
  }, [reportsData]);

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  const summary = reportsData?.summary || {};
  const productPerformance = reportsData?.product_performance || [];
  const paymentMethods = reportsData?.payment_methods || [];

  // Prepare data for donut charts
  const orderStatusData = [
    { label: 'Pending', value: summary.orders?.pending || 0 },
    { label: 'Active', value: summary.orders?.active || 0 },
    { label: 'Completed', value: summary.orders?.completed || 0 },
  ];

  const paymentStatusData = [
    { label: 'Paid', value: summary.installments?.paid || 0 },
    { label: 'Due Today', value: summary.installments?.due_today || 0 },
    { label: 'Overdue', value: summary.installments?.overdue || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Summary</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Orders</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="installments" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Installments</span>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {reportType !== 'summary' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="text-lg">Advanced Filters</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <Select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                      <option value="">All Customers</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.full_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                      <option value="">All Products</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <TabsContent value="summary" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.orders?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.orders?.active || 0} active orders
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.revenue?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.revenue?.last_30_days || 0)} last 30 days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.revenue?.outstanding || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.installments?.overdue || 0} overdue payments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.customers?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.customers?.active || 0} active customers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          {chartData && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Last 12 months revenue performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <TrendingUp className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Revenue: {formatCurrency(chartData.revenue.reduce((a, b) => a + b, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chartData.revenue.length} months of data
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Orders Trends</CardTitle>
                  <CardDescription>Last 12 months order volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Total Orders: {chartData.orders.reduce((a, b) => a + b, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chartData.orders.length} months of data
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Products ranked by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.product__name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.order_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Breakdown by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">
                          {method.payment_method.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{method.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(method.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Reports */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Report</CardTitle>
              <CardDescription>Detailed order information</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedData?.orders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.customer?.full_name}</TableCell>
                        <TableCell>{order.product?.name}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'completed' ? 'default' :
                            order.status === 'active' ? 'secondary' :
                            'outline'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments Report</CardTitle>
              <CardDescription>Payment transaction details</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedData?.payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">#{payment.order?.id}</Badge>
                        </TableCell>
                        <TableCell>{payment.order?.customer?.full_name}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installments Report</CardTitle>
              <CardDescription>Installment schedule and status</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Installment</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedData?.installments?.map((installment) => (
                      <TableRow key={installment.id}>
                        <TableCell className="font-medium">#{installment.installment_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">#{installment.order?.id}</Badge>
                        </TableCell>
                        <TableCell>{installment.order?.customer?.full_name}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(installment.amount)}
                        </TableCell>
                        <TableCell>{formatDate(installment.due_date)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            installment.status === 'paid' ? 'default' :
                            installment.status === 'overdue' ? 'destructive' :
                            'secondary'
                          }>
                            {installment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsShadcn;
