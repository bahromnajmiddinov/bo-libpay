import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');

  // Fetch reports summary
  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    'reportsSummary',
    orderService.getReportsSummary,
    {
      refetchInterval: 60000, // Refresh every minute
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

  const handleExport = (format) => {
    let dataToExport = [];
    let filename = '';

    switch (reportType) {
      case 'orders':
        if (detailedData?.orders) {
          dataToExport = detailedData.orders.map(order => ({
            'Order ID': order.id,
            'Customer': order.customer?.full_name || 'N/A',
            'Product': order.product?.name || 'N/A',
            'Total Amount': order.total_amount,
            'Status': order.status,
            'Order Date': order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'
          }));
          filename = 'orders_report';
        }
        break;
      case 'payments':
        if (detailedData?.payments) {
          dataToExport = detailedData.payments.map(payment => ({
            'Payment ID': payment.id,
            'Order ID': payment.order?.id || 'N/A',
            'Customer': payment.order?.customer?.full_name || 'N/A',
            'Amount': payment.amount,
            'Method': payment.payment_method,
            'Date': payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'
          }));
          filename = 'payments_report';
        }
        break;
      case 'installments':
        if (detailedData?.installments) {
          dataToExport = detailedData.installments.map(installment => ({
            'Installment': installment.installment_number,
            'Order ID': installment.order?.id || 'N/A',
            'Customer': installment.order?.customer?.full_name || 'N/A',
            'Amount': installment.amount,
            'Due Date': installment.due_date ? new Date(installment.due_date).toLocaleDateString() : 'N/A',
            'Status': installment.status
          }));
          filename = 'installments_report';
        }
        break;
      default:
        // Summary export
        if (reportsData) {
          dataToExport = [{
            'Total Orders': reportsData.summary?.orders?.total || 0,
            'Active Orders': reportsData.summary?.orders?.active || 0,
            'Total Revenue': reportsData.summary?.revenue?.total || 0,
            'Outstanding Balance': reportsData.summary?.revenue?.outstanding || 0,
            'Total Customers': reportsData.summary?.customers?.total || 0,
            'Active Customers': reportsData.summary?.customers?.active || 0
          }];
          filename = 'summary_report';
        }
    }

    if (dataToExport.length === 0) {
      toast.error('No data available to export');
      return;
    }

    if (format === 'csv') {
      const csvContent = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success(`Report exported as ${format.toUpperCase()} successfully!`);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCustomer('');
    setSelectedProduct('');
    setSelectedStatus('');
    setSelectedPeriod('30');
    const dates = getPeriodDates('30');
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  // Generate beautiful chart data for monthly trends
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

  // Create beautiful line chart component
  const LineChart = ({ data, title, color = '#667eea', height = 300 }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    const width = 800;
    const chartHeight = height - 80;
    const padding = 40;

    const points = data.map((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `M${padding},${padding + chartHeight} L${points} L${padding + width - 2 * padding},${padding + chartHeight} Z`;

    return (
      <div className="chart-container slide-up">
        <div className="chart-title">{title}</div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          
          {/* Grid */}
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area under the line */}
          <path d={areaPoints} fill={`url(#gradient-${color})`} />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          
          {/* Data points */}
          {data.map((value, index) => {
            const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
            const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="data-point"
                />
                <text
                  x={x}
                  y={y - 15}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                  className="data-label"
                >
                  {title.includes('Revenue') ? formatCurrency(value) : value}
                </text>
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const value = minValue + range * ratio;
            const y = padding + chartHeight - ratio * chartHeight;
            
            return (
              <text
                key={index}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#888"
              >
                {title.includes('Revenue') ? formatCurrency(value) : Math.round(value)}
              </text>
            );
          })}
          
          {/* X-axis labels */}
          {data.map((value, index) => {
            const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
            const label = index % 2 === 0 ? chartData.labels[index] : '';
            
            return (
              <text
                key={index}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#888"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Create beautiful donut chart component
  const DonutChart = ({ data, title, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'] }) => {
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const radius = 80;
    const centerX = 120;
    const centerY = 120;

    return (
      <div className="chart-container slide-up">
        <div className="chart-title">{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <svg width="240" height="240" viewBox="0 0 240 240">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const startAngleRad = (startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (endAngle - 90) * (Math.PI / 180);
              
              const x1 = centerX + radius * Math.cos(startAngleRad);
              const y1 = centerY + radius * Math.sin(startAngleRad);
              const x2 = centerX + radius * Math.cos(endAngleRad);
              const y2 = centerY + radius * Math.sin(endAngleRad);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                  className="donut-segment"
                />
              );
            })}
            
            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r="50"
              fill="white"
              stroke="#f0f0f0"
              strokeWidth="2"
            />
            <text
              x={centerX}
              y={centerY - 5}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#333"
            >
              {total}
            </text>
            <text
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              Total
            </text>
          </svg>
          
          {/* Legend */}
          <div className="chart-legend">
            {data.map((item, index) => (
              <div key={index} className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="legend-text">
                  <div className="legend-label">{item.label}</div>
                  <div className="legend-value">{item.value} ({((item.value / total) * 100).toFixed(1)}%)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (reportsLoading) {
    return (
      <div className="loading-modern">
        <div className="loading-spinner"></div>
        <div>Loading beautiful reports...</div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </Select>
          <Select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
          <Button 
            variant="outline"
            onClick={() => handleExport(exportFormat)}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="installments">Installments</TabsTrigger>
        </TabsList>

        {/* Filter Panel */}
        {reportType !== 'summary' && (
          <Card>
            <CardHeader>
              <CardTitle>Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
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
                  <label className="text-sm font-medium">Product</label>
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
                  <label className="text-sm font-medium">Status</label>
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
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="summary">
          {reportType === 'summary' && (
        <>
          {/* Beautiful Metric Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="metric-card info slide-up">
                <div className="metric-value">{formatNumber(summary.orders?.total || 0)}</div>
                <div className="metric-label">Total Orders</div>
                <div className="metric-subtext">
                  {summary.orders?.active || 0} Active Orders
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card success slide-up">
                <div className="metric-value">{formatCurrency(summary.revenue?.total || 0)}</div>
                <div className="metric-label">Total Revenue</div>
                <div className="metric-subtext">
                  {formatCurrency(summary.revenue?.last_30_days || 0)} Last 30 Days
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card warning slide-up">
                <div className="metric-value">{formatCurrency(summary.revenue?.outstanding || 0)}</div>
                <div className="metric-label">Outstanding Balance</div>
                <div className="metric-subtext">
                  {summary.installments?.overdue || 0} Overdue Payments
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card danger slide-up">
                <div className="metric-value">{formatNumber(summary.customers?.total || 0)}</div>
                <div className="metric-label">Total Customers</div>
                <div className="metric-subtext">
                  {summary.customers?.active || 0} Active Customers
                </div>
              </div>
            </div>
          </div>

          {/* Beautiful Charts Row */}
          <div className="row mb-4">
            <div className="col-md-6">
              {chartData && (
                <LineChart
                  data={chartData.revenue}
                  title="💰 Revenue Trends (Last 12 Months)"
                  color="#4facfe"
                  height={350}
                />
              )}
            </div>
            <div className="col-md-6">
              {chartData && (
                <LineChart
                  data={chartData.orders}
                  title="📈 Orders Trends (Last 12 Months)"
                  color="#43e97b"
                  height={350}
                />
              )}
            </div>
          </div>

          {/* Donut Charts Row */}
          <div className="row mb-4">
            <div className="col-md-6">
              <DonutChart
                data={orderStatusData}
                title="📊 Order Status Distribution"
                colors={['#667eea', '#764ba2', '#f093fb']}
              />
            </div>
            <div className="col-md-6">
              <DonutChart
                data={paymentStatusData}
                title="💳 Payment Status Overview"
                colors={['#4facfe', '#43e97b', '#fa709a']}
              />
            </div>
          </div>

          {/* Performance Tables */}
          <div className="row">
            <div className="col-md-6">
              <div className="card-modern slide-up">
                <div className="card-body">
                  <h6 className="chart-title">🏆 Top Performing Products</h6>
                  <div className="table-responsive">
                    <table className="table table-modern">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Orders</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productPerformance.map((product, index) => (
                          <tr key={index}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="me-3" style={{ 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '50%', 
                                  backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'][index % 5] 
                                }}></div>
                                {product.product__name}
                              </div>
                            </td>
                            <td>
                              <span className="badge-modern badge-info-modern">
                                {product.order_count}
                              </span>
                            </td>
                            <td className="fw-bold text-success">
                              {formatCurrency(product.total_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card-modern slide-up">
                <div className="card-body">
                  <h6 className="chart-title">💳 Payment Methods Breakdown</h6>
                  <div className="table-responsive">
                    <table className="table table-modern">
                      <thead>
                        <tr>
                          <th>Method</th>
                          <th>Count</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentMethods.map((method, index) => (
                          <tr key={index}>
                            <td className="text-capitalize">
                              <div className="d-flex align-items-center">
                                <div className="me-3" style={{ 
                                  width: '12px', 
                                  height: '12px', 
                                  borderRadius: '50%', 
                                  backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'][index % 5] 
                                }}></div>
                                {method.payment_method.replace('_', ' ')}
                              </div>
                            </td>
                            <td>
                              <span className="badge-modern badge-warning-modern">
                                {method.count}
                              </span>
                            </td>
                            <td className="fw-bold text-primary">
                              {formatCurrency(method.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Detailed Reports */}
      {reportType !== 'summary' && (
        <div className="card-modern slide-up">
          <div className="card-body">
            <h6 className="chart-title">
              {reportType === 'orders' && '📋 Orders Report'}
              {reportType === 'payments' && '💰 Payments Report'}
              {reportType === 'installments' && '📅 Installments Report'}
            </h6>
            {detailedLoading ? (
              <div className="loading-modern">
                <div className="loading-spinner"></div>
                <div>Loading detailed data...</div>
              </div>
            ) : (
              <div className="table-responsive">
                {reportType === 'orders' && detailedData?.orders && (
                  <table className="table table-modern">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                        <th>Order Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <span className="badge-modern badge-info-modern">
                              #{order.id}
                            </span>
                          </td>
                          <td>{order.customer?.full_name}</td>
                          <td>{order.product?.name}</td>
                          <td className="fw-bold text-success">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td>
                            <span className={`badge-modern ${
                              order.status === 'completed' ? 'badge-success-modern' :
                              order.status === 'active' ? 'badge-info-modern' :
                              order.status === 'approved' ? 'badge-warning-modern' :
                              'badge-danger-modern'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{formatDate(order.order_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'payments' && detailedData?.payments && (
                  <table className="table table-modern">
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <span className="badge-modern badge-success-modern">
                              #{payment.id}
                            </span>
                          </td>
                          <td>
                            <span className="badge-modern badge-info-modern">
                              #{payment.order?.id}
                            </span>
                          </td>
                          <td>{payment.order?.customer?.full_name}</td>
                          <td className="fw-bold text-success">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="text-capitalize">
                            {payment.payment_method.replace('_', ' ')}
                          </td>
                          <td>{formatDate(payment.payment_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'installments' && detailedData?.installments && (
                  <table className="table table-modern">
                    <thead>
                      <tr>
                        <th>Installment</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.installments.map((installment) => (
                        <tr key={installment.id}>
                          <td>
                            <span className="badge-modern badge-warning-modern">
                              #{installment.installment_number}
                            </span>
                          </td>
                          <td>
                            <span className="badge-modern badge-info-modern">
                              #{installment.order?.id}
                            </span>
                          </td>
                          <td>{installment.order?.customer?.full_name}</td>
                          <td className="fw-bold text-primary">
                            {formatCurrency(installment.amount)}
                          </td>
                          <td>{formatDate(installment.due_date)}</td>
                          <td>
                            <span className={`badge-modern ${
                              installment.status === 'paid' ? 'badge-success-modern' :
                              installment.status === 'overdue' ? 'badge-danger-modern' :
                              'badge-warning-modern'
                            }`}>
                              {installment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {(!detailedData || 
                  (reportType === 'orders' && !detailedData.orders?.length) ||
                  (reportType === 'payments' && !detailedData.payments?.length) ||
                  (reportType === 'installments' && !detailedData.installments?.length)) && (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No Data Found</div>
                    <div className="empty-state-text">
                      No data found for the selected filters. Try adjusting your search criteria.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;