import React, { useState, useMemo, useEffect } from 'react';
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
  Download,
  Filter,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const ReportsShadcn = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('last_30');
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useTranslation();

  // Period mapping - frontend period qiymatlarini backendga moslashtirish
  const periodMapping = {
    '7': 'last_7',
    '30': 'last_30', 
    '90': 'last_90',
    '365': 'last_year'
  };

  // Boshlang'ich sanalarni o'rnatish
  useEffect(() => {
    const getPeriodDates = (period) => {
      const today = new Date();
      const end = new Date(today);
      let start = new Date(today);

      switch (period) {
        case '7':
        case 'last_7':
          start.setDate(today.getDate() - 7);
          break;
        case '30':
        case 'last_30':
          start.setDate(today.getDate() - 30);
          break;
        case '90':
        case 'last_90':
          start.setDate(today.getDate() - 90);
          break;
        case '365':
        case 'last_year':
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

    const dates = getPeriodDates(selectedPeriod);
    setStartDate(dates.start);
    setEndDate(dates.end);
  }, [selectedPeriod]);

  // Backend period qiymatini olish
  const getBackendPeriod = () => {
    return periodMapping[selectedPeriod] || selectedPeriod;
  };

  // Fetch reports summary
  const { 
    data: reportsData, 
    isLoading: reportsLoading, 
    refetch: refetchSummary,
    error: summaryError 
  } = useQuery(
    ['reportsSummary', { startDate, endDate, selectedPeriod }],
    () => orderService.getReportsSummary({
      start_date: startDate,
      end_date: endDate,
      range: getBackendPeriod()
    }),
    {
      refetchInterval: 60000,
      enabled: reportType === 'summary',
      onError: (error) => {
        console.error('Reports summary error:', error);
        toast.error(t('reports.loading_error', 'Failed to load reports summary'));
      }
    }
  );

  // Fetch detailed reports
  const { 
    data: detailedData, 
    isLoading: detailedLoading, 
    refetch: refetchDetailed,
    error: detailedError 
  } = useQuery(
    ['detailedReports', { 
      startDate, 
      endDate, 
      selectedCustomer, 
      selectedProduct, 
      selectedStatus, 
      reportType,
      selectedPeriod 
    }],
    () => orderService.getDetailedReports({
      start_date: startDate,
      end_date: endDate,
      range: getBackendPeriod(),
      customer_id: selectedCustomer,
      product_id: selectedProduct,
      status: selectedStatus,
      type: reportType
    }),
    {
      enabled: reportType !== 'summary',
      onError: (error) => {
        console.error('Detailed reports error:', error);
        toast.error(t('reports.detailed_loading_error', 'Failed to load detailed reports'));
      }
    }
  );

  // Fetch products and customers for filters
  const { data: productsData } = useQuery('products', productService.getProducts);
  const { data: customersData } = useQuery('customers', customerService.getCustomers);

  const products = productsData?.results || productsData || [];
  const customers = customersData?.results || customersData || [];

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Generate chart data for monthly trends
  const chartData = useMemo(() => {
    if (!reportsData?.monthly_trends) return null;

    const data = reportsData.monthly_trends.slice(-12);
    
    return {
      labels: data.map(item => {
        const date = new Date(item.month + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      revenue: data.map(item => item.revenue || 0),
      orders: data.map(item => item.orders || 0)
    };
  }, [reportsData]);

  // Handle export
  const handleExport = async (format) => {
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        range: getBackendPeriod(),
        customer_id: selectedCustomer,
        product_id: selectedProduct,
        status: selectedStatus,
        type: reportType,
        format: format
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key] && params[key] !== 0) delete params[key];
      });

      const response = await orderService.getDetailedReports(params);
      
      if (format === 'csv') {
        // CSV export logikasi
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (reportType === 'orders') {
          csvContent += "Order ID,Customer,Product,Total Amount,Status,Order Date\n";
          response.orders?.forEach(order => {
            csvContent += `${order.id},${order.customer?.full_name || 'N/A'},${order.product?.name || 'N/A'},${order.total_amount},${order.status},${formatDate(order.order_date)}\n`;
          });
        } else if (reportType === 'payments') {
          csvContent += "Payment ID,Order ID,Customer,Amount,Method,Date\n";
          response.payments?.forEach(payment => {
            csvContent += `${payment.id},${payment.order?.id || 'N/A'},${payment.order?.customer?.full_name || 'N/A'},${payment.amount},${payment.payment_method},${formatDate(payment.payment_date)}\n`;
          });
        } else if (reportType === 'installments') {
          csvContent += "Installment,Order ID,Customer,Amount,Due Date,Status\n";
          response.installments?.forEach(installment => {
            csvContent += `${installment.installment_number},${installment.order?.id || 'N/A'},${installment.order?.customer?.full_name || 'N/A'},${installment.amount},${formatDate(installment.due_date)},${installment.status}\n`;
          });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reports_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `reports_${reportType}_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success(t('reports.export_success', `Reports exported as ${format.toUpperCase()} successfully!`));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('reports.export_failed', 'Failed to export reports'));
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedCustomer('');
    setSelectedProduct('');
    setSelectedStatus('');
  };

  // Refresh data
  const handleRefresh = () => {
    if (reportType === 'summary') {
      refetchSummary();
    } else {
      refetchDetailed();
    }
    toast.success(t('reports.refreshed', 'Data refreshed successfully'));
  };

  if (reportsLoading && reportType === 'summary') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">{t('reports.loading_reports', 'Loading reports...')}</p>
        </div>
      </div>
    );
  }

  const summary = reportsData?.summary || {};
  const productPerformance = reportsData?.product_performance || [];
  const paymentMethods = reportsData?.payment_methods || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground">
            {t('reports.description')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('reports.refresh')}
          </Button>
          
          {/* Period Select - oddiy select element */}
          <select 
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="w-[180px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="last_7">{t('reports.periods.7')}</option>
            <option value="last_30">{t('reports.periods.30')}</option>
            <option value="last_90">{t('reports.periods.90')}</option>
            <option value="last_year">{t('reports.periods.365')}</option>
          </select>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(summaryError || detailedError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-800 font-medium">
                  {t('reports.loading_error', 'Failed to load reports data')}
                </p>
                <p className="text-red-600 text-sm">
                  {summaryError?.message || detailedError?.message}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                {t('reports.retry', 'Retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>{t('reports.tabs.summary')}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>{t('reports.tabs.orders')}</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>{t('reports.tabs.payments')}</span>
          </TabsTrigger>
          <TabsTrigger value="installments" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{t('reports.tabs.installments')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {reportType !== 'summary' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="text-lg">{t('reports.filters.title')}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    disabled={!selectedCustomer && !selectedProduct && !selectedStatus}
                  >
                    {t('reports.filters.clear')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="ml-2">{showFilters ? t('reports.filters.hide') : t('reports.filters.show')}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">{t('reports.filters.start_date')}</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">{t('reports.filters.end_date')}</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">{t('reports.filters.customer')}</Label>
                    <select
                      id="customer"
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('reports.filters.all_customers')}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id.toString()}>
                          {customer.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product">{t('reports.filters.product')}</Label>
                    <select
                      id="product"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('reports.filters.all_products')}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id.toString()}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">{t('reports.filters.status')}</Label>
                    <select
                      id="status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('reports.filters.all_statuses')}</option>
                      <option value="pending">{t('orders.pending')}</option>
                      <option value="approved">{t('orders.approved')}</option>
                      <option value="active">{t('orders.active')}</option>
                      <option value="completed">{t('orders.completed')}</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t('reports.filters.active_filters', { 
                      count: [selectedCustomer, selectedProduct, selectedStatus].filter(Boolean).length 
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refetchDetailed}
                    disabled={detailedLoading}
                  >
                    {detailedLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t('reports.filters.apply')}</span>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports.metrics.total_orders')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.orders?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.orders?.active || 0} {t('reports.metrics.active_orders')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports.metrics.total_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.revenue?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.revenue?.last_30_days || 0)} {t('reports.metrics.last_30_days')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports.metrics.outstanding_balance')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.revenue?.outstanding || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.installments?.overdue || 0} {t('reports.metrics.overdue_payments')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports.metrics.total_customers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.customers?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.customers?.active || 0} {t('reports.metrics.active_customers')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          {chartData && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.charts.revenue_trends')}</CardTitle>
                  <CardDescription>{t('reports.charts.revenue_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <TrendingUp className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {t('reports.charts.total_revenue')}: {formatCurrency(chartData.revenue.reduce((a, b) => a + b, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chartData.revenue.length} {t('reports.charts.months_of_data')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.charts.orders_trends')}</CardTitle>
                  <CardDescription>{t('reports.charts.orders_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-12 w-12 mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {t('reports.charts.total_orders')}: {chartData.orders.reduce((a, b) => a + b, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chartData.orders.length} {t('reports.charts.months_of_data')}
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
                <CardTitle>{t('reports.tables.top_products')}</CardTitle>
                <CardDescription>{t('reports.tables.top_products_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports.tables.product')}</TableHead>
                      <TableHead>{t('reports.tables.orders')}</TableHead>
                      <TableHead>{t('reports.tables.revenue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.length > 0 ? (
                      productPerformance.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{product.product__name || t('reports.tables.unknown_product')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.order_count || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(product.total_revenue || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          {t('reports.tables.no_data')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.tables.payment_methods')}</CardTitle>
                <CardDescription>{t('reports.tables.payment_methods_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports.tables.method')}</TableHead>
                      <TableHead>{t('reports.tables.count')}</TableHead>
                      <TableHead>{t('reports.tables.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium capitalize">
                            {method.payment_method?.replace('_', ' ') || t('reports.tables.unknown_method')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{method.count || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(method.total || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          {t('reports.tables.no_data')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.detailed_reports.orders.title')}</CardTitle>
              <CardDescription>{t('reports.detailed_reports.orders.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : detailedData?.orders && detailedData.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.detailed_reports.orders.order_id')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.orders.customer')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.orders.product')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.orders.total_amount')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.orders.status')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.orders.order_date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{order.customer?.full_name || t('reports.detailed_reports.orders.unknown_customer')}</TableCell>
                          <TableCell>{order.product?.name || t('reports.detailed_reports.orders.unknown_product')}</TableCell>
                          <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'active' ? 'secondary' :
                              order.status === 'approved' ? 'outline' :
                              'destructive'
                            }>
                              {t(`orders.${order.status}`, order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold mb-2">{t('reports.detailed_reports.no_data')}</h3>
                  <p className="text-muted-foreground">
                    {t('reports.detailed_reports.no_orders_description')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.detailed_reports.payments.title')}</CardTitle>
              <CardDescription>{t('reports.detailed_reports.payments.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : detailedData?.payments && detailedData.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.detailed_reports.payments.payment_id')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.payments.order_id')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.payments.customer')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.payments.amount')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.payments.method')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.payments.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedData.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">#{payment.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{payment.order?.id}</Badge>
                          </TableCell>
                          <TableCell>{payment.order?.customer?.full_name || t('reports.detailed_reports.payments.unknown_customer')}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method?.replace('_', ' ') || t('reports.detailed_reports.payments.unknown_method')}
                          </TableCell>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💳</div>
                  <h3 className="text-lg font-semibold mb-2">{t('reports.detailed_reports.no_data')}</h3>
                  <p className="text-muted-foreground">
                    {t('reports.detailed_reports.no_payments_description')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.detailed_reports.installments.title')}</CardTitle>
              <CardDescription>{t('reports.detailed_reports.installments.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : detailedData?.installments && detailedData.installments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.detailed_reports.installments.installment')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.installments.order_id')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.installments.customer')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.installments.amount')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.installments.due_date')}</TableHead>
                        <TableHead>{t('reports.detailed_reports.installments.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedData.installments.map((installment) => (
                        <TableRow key={installment.id}>
                          <TableCell className="font-medium">#{installment.installment_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{installment.order?.id}</Badge>
                          </TableCell>
                          <TableCell>{installment.order?.customer?.full_name || t('reports.detailed_reports.installments.unknown_customer')}</TableCell>
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
                              {t(`orders.${installment.status}`, installment.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-semibold mb-2">{t('reports.detailed_reports.no_data')}</h3>
                  <p className="text-muted-foreground">
                    {t('reports.detailed_reports.no_installments_description')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsShadcn;