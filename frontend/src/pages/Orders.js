import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Table as TableIcon, Grid, Calendar, DollarSign, User, Package, CreditCard, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// View toggle component
const ViewToggle = ({ view, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center space-x-1 border rounded-lg p-1 bg-gray-50">
      <button
        onClick={() => onChange('table')}
        className={`p-2 rounded-md transition-colors ${
          view === 'table' 
            ? 'bg-white shadow-sm border' 
            : 'hover:bg-gray-100'
        }`}
        title={t('orders.table_view', 'Table View')}
      >
        <TableIcon size={18} />
      </button>
      <button
        onClick={() => onChange('card')}
        className={`p-2 rounded-md transition-colors ${
          view === 'card' 
            ? 'bg-white shadow-sm border' 
            : 'hover:bg-gray-100'
        }`}
        title={t('orders.card_view', 'Card View')}
      >
        <Grid size={18} />
      </button>
    </div>
  );
};

const Orders = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('order_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState('table');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery(
    'orders',
    orderService.getOrders,
    {
      refetchInterval: 30000,
    }
  );

  // Extract orders array from paginated response
  const orders = ordersData?.results || ordersData || [];

  // Enhanced filtering and sorting
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((o) => {
        const customerName = (o.customer?.full_name || '').toString().toLowerCase();
        const productName = (o.product?.name || '').toString().toLowerCase();
        const orderId = o.id.toString();
        return customerName.includes(normalizedQuery) || 
               productName.includes(normalizedQuery) || 
               orderId.includes(normalizedQuery);
      });
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Customer filter
    if (customerFilter) {
      filtered = filtered.filter((o) => {
        const customerId = o.customer?.id || o.customer_id;
        return customerId && customerId.toString() === customerFilter;
      });
    }

    // Product filter
    if (productFilter) {
      filtered = filtered.filter((o) => {
        const productId = o.product?.id || o.product_id;
        return productId && productId.toString() === productFilter;
      });
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter((o) => new Date(o.order_date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter((o) => new Date(o.order_date) <= new Date(dateRange.end));
    }

    // Amount range filter
    if (amountRange.min !== '') {
      filtered = filtered.filter((o) => o.total_amount >= parseFloat(amountRange.min));
    }
    if (amountRange.max !== '') {
      filtered = filtered.filter((o) => o.total_amount <= parseFloat(amountRange.max));
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'order_date':
          aValue = new Date(a.order_date || 0);
          bValue = new Date(b.order_date || 0);
          break;
        case 'total_amount':
          aValue = a.total_amount || 0;
          bValue = b.total_amount || 0;
          break;
        case 'customer':
          aValue = (a.customer?.full_name || '').toLowerCase();
          bValue = (b.customer?.full_name || '').toLowerCase();
          break;
        case 'product':
          aValue = (a.product?.name || '').toLowerCase();
          bValue = (b.product?.name || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        default:
          aValue = new Date(a.order_date || 0);
          bValue = new Date(b.order_date || 0);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchQuery, statusFilter, customerFilter, productFilter, dateRange, amountRange, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedOrders.length / pageSize));
  const paginatedOrders = filteredAndSortedOrders.slice((page - 1) * pageSize, page * pageSize);

  // Fetch products for order creation
  const { data: productsData } = useQuery('products', productService.getProducts);
  const products = productsData?.results || productsData || [];

  // Fetch customers for order creation
  const { data: customersData } = useQuery('customers', customerService.getCustomers);
  const customers = customersData?.results || customersData || [];

  // Dashboard stats
  const { data: stats } = useQuery('dashboardStats', orderService.getDashboardStats);

  // Due installments
  const { data: dueData } = useQuery('dueInstallments', orderService.getDueInstallments);

  // Mutations
  const createOrderMutation = useMutation(orderService.createOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      queryClient.invalidateQueries('dueInstallments');
      toast.success(t('orders.order_created', 'Order created successfully!'));
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('orders.create_failed', 'Failed to create order'));
    },
  });

  const updateOrderMutation = useMutation(
    ({ id, data }) => orderService.updateOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders');
        queryClient.invalidateQueries('dashboardStats');
        queryClient.invalidateQueries('dueInstallments');
        toast.success(t('orders.order_updated', 'Order updated successfully!'));
        setShowModal(false);
        setEditingOrder(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('orders.update_failed', 'Failed to update order'));
      },
    }
  );

  const approveOrderMutation = useMutation(orderService.approveOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      queryClient.invalidateQueries('dueInstallments');
      toast.success(t('orders.order_approved', 'Order approved successfully!'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('orders.approve_failed', 'Failed to approve order'));
    },
  });

  const deleteOrderMutation = useMutation(orderService.deleteOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      queryClient.invalidateQueries('dueInstallments');
      toast.success(t('orders.order_deleted', 'Order deleted successfully!'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('orders.delete_failed', 'Failed to delete order'));
    },
  });

  const createPaymentMutation = useMutation(orderService.createPayment, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      queryClient.invalidateQueries('dueInstallments');
      toast.success(t('orders.payment_recorded', 'Payment recorded successfully!'));
      setShowPaymentModal(false);
      resetPaymentForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('orders.payment_failed', 'Failed to record payment'));
    },
  });

  const [formData, setFormData] = useState({
    customer: '',
    product: '',
    quantity: 1,
    total_amount: '',
    down_payment: '',
    installment_count: 6,
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      customer: '',
      product: '',
      quantity: 1,
      total_amount: '',
      down_payment: '',
      installment_count: 6,
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (e) => {
    const productId = parseInt(e.target.value);
    const selectedProduct = products.find(p => p.id === productId);
    
    setFormData(prev => ({
      ...prev,
      product: productId,
      total_amount: selectedProduct ? (selectedProduct.price * prev.quantity).toString() : '',
      min_installments: selectedProduct?.min_installments || 1,
      max_installments: selectedProduct?.max_installments || 12,
    }));
  };

  const handleQuantityChange = (e) => {
    const quantity = parseInt(e.target.value);
    const selectedProduct = products.find(p => p.id === formData.product);
    
    setFormData(prev => ({
      ...prev,
      quantity: quantity,
      total_amount: selectedProduct ? (selectedProduct.price * quantity).toString() : '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      customer: parseInt(formData.customer),
      product: parseInt(formData.product),
      total_amount: parseFloat(formData.total_amount),
      down_payment: parseFloat(formData.down_payment || 0),
      installment_count: parseInt(formData.installment_count),
    };

    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: submitData });
    } else {
      createOrderMutation.mutate(submitData);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...paymentForm,
      order: selectedOrder.id,
      amount: parseFloat(paymentForm.amount),
    };

    createPaymentMutation.mutate(submitData);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer?.id?.toString() || '',
      product: order.product?.id?.toString() || '',
      quantity: order.quantity,
      total_amount: order.total_amount.toString(),
      down_payment: order.down_payment.toString(),
      installment_count: order.installment_count,
      notes: order.notes || '',
    });
    setShowModal(true);
  };

  const handleApprove = (order) => {
    if (window.confirm(t('orders.approve_confirm', `Are you sure you want to approve Order #${order.id}?`))) {
      approveOrderMutation.mutate(order.id);
    }
  };

  const handleDelete = (order) => {
    if (window.confirm(t('orders.delete_confirm', `Are you sure you want to delete Order #${order.id}?`))) {
      deleteOrderMutation.mutate(order.id);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleRecordPayment = (order) => {
    setSelectedOrder(order);
    setPaymentForm(prev => ({
      ...prev,
      amount: order.monthly_payment?.toString() || '',
    }));
    setShowPaymentModal(true);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = (format) => {
    const dataToExport = filteredAndSortedOrders.map(order => ({
      [t('orders.order_id')]: order.id,
      [t('orders.customer')]: order.customer?.full_name || t('orders.na'),
      [t('orders.product')]: order.product?.name || t('orders.na'),
      [t('orders.total_amount')]: order.total_amount,
      [t('orders.down_payment')]: order.down_payment,
      [t('orders.status')]: order.status,
      [t('orders.installments')]: order.installment_count,
      [t('orders.order_date')]: order.order_date ? new Date(order.order_date).toLocaleDateString() : t('orders.na'),
      [t('orders.approved_date')]: order.approved_date ? new Date(order.approved_date).toLocaleDateString() : t('orders.na')
    }));

    if (format === 'csv') {
      const csvContent = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success(t('orders.export_success', `Orders exported as ${format.toUpperCase()} successfully!`));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCustomerFilter('');
    setProductFilter('');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setSortBy('order_date');
    setSortOrder('desc');
    setPage(1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Card View Component
  const OrderCardView = ({ orders }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{t('orders.order_id')} #{order.id}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.order_date)}
                  </p>
                </div>
                <Badge variant={
                  order.status === 'completed' ? "default" :
                  order.status === 'active' ? "secondary" :
                  order.status === 'approved' ? "outline" :
                  "destructive"
                }>
                  {t(`orders.${order.status}`, order.status)}
                </Badge>
              </div>

              {/* Customer & Product */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User size={16} className="text-muted-foreground" />
                  <span className="font-medium">{order.customer?.full_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package size={16} className="text-muted-foreground" />
                  <span className="text-sm">
                    {order.product?.name} × {order.quantity}
                  </span>
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('orders.total_amount')}:</span>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('orders.down_payment')}:</span>
                  <div className="font-medium">
                    {formatCurrency(order.down_payment)}
                  </div>
                </div>
              </div>

              {/* Installments */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span>{order.installment_count} {t('products.months')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign size={14} className="text-muted-foreground" />
                  <span className="font-medium">
                    {formatCurrency(order.monthly_payment || 0)}/mo
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(order)}
                >
                  {t('orders.details')}
                </Button>
                {order.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(order)}
                  >
                    {t('orders.approve')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecordPayment(order)}
                >
                  {t('orders.payment')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(order)}
                >
                  {t('orders.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(order)}
                >
                  {t('orders.delete')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">{t('loading', 'Loading orders...')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('orders.title')}</h1>
          <p className="text-muted-foreground">
            {t('orders.description')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Button
            onClick={() => {
              setEditingOrder(null);
              resetForm();
              setShowModal(true);
            }}
          >
            {t('orders.create_order')}
          </Button>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <span>{t('orders.filters_search')}</span>
          <span>{showMobileFilters ? '▲' : '▼'}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className={`${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
        <CardHeader>
          <CardTitle>{t('orders.filters_search')}</CardTitle>
          <CardDescription>
            {t('orders.filters_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.search', 'Search')}</label>
              <Input
                placeholder={t('orders.search_placeholder')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.status')}</label>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('orders.all_status')}</option>
                <option value="pending">{t('orders.pending')}</option>
                <option value="approved">{t('orders.approved')}</option>
                <option value="active">{t('orders.active')}</option>
                <option value="completed">{t('orders.completed')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.customer')}</label>
              <Select
                value={customerFilter}
                onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('orders.all_customers')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.product')}</label>
              <Select
                value={productFilter}
                onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('orders.all_products')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.start_date')}</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.end_date')}</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.sort_by')}</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="order_date">{t('orders.order_date')}</option>
                <option value="total_amount">{t('orders.total_amount')}</option>
                <option value="customer">{t('orders.customer')}</option>
                <option value="product">{t('orders.product')}</option>
                <option value="status">{t('orders.status')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.order')}</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">{t('orders.newest_first')}</option>
                <option value="asc">{t('orders.oldest_first')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.actions')}</label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t('orders.clear')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  {t('orders.export_csv')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                  {t('orders.export_json')}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('orders.amount_range')}</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder={t('orders.min_amount')}
                  value={amountRange.min}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder={t('orders.max_amount')}
                  value={amountRange.max}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Badge variant="secondary">
              {t('orders.orders_found', { count: filteredAndSortedOrders.length })}
            </Badge>
            <div className="text-sm text-muted-foreground lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                {t('orders.close_filters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orders.total_orders')}</p>
                  <p className="text-2xl font-bold">{stats.orders?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.orders?.active || 0} {t('orders.active_orders')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orders.pending_orders')}</p>
                  <p className="text-2xl font-bold">{stats.orders?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('orders.requires_approval')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orders.active_orders')}</p>
                  <p className="text-2xl font-bold">{stats.orders?.active || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('orders.in_progress')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('orders.total_revenue')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.payments?.total_revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('orders.all_time_earnings')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Due Payments Alert */}
      {dueData && (dueData.due_today?.length > 0 || dueData.overdue?.length > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600">⚠️</span>
              </div>
              <div>
                <h4 className="font-semibold">{t('orders.payment_alerts')}</h4>
                <div className="text-sm">
                  {dueData.due_today?.length > 0 && (
                    <p>
                      <strong>{dueData.due_today.length}</strong> {t('orders.due_today', { count: dueData.due_today.length })}
                    </p>
                  )}
                  {dueData.overdue?.length > 0 && (
                    <p>
                      <strong>{dueData.overdue.length}</strong> {t('orders.overdue_payments', { count: dueData.overdue.length })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>
                {viewMode === 'table' ? t('orders.orders_list') : t('orders.orders_grid')}
              </CardTitle>
              <CardDescription>
                {viewMode === 'table' 
                  ? t('orders.table_view_description') 
                  : t('orders.card_view_description')
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {t('orders.view', 'View')}:
              </span>
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Array.isArray(paginatedOrders) && paginatedOrders.length > 0 ? (
            <div className="space-y-4">
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('orders.order_id')}</TableHead>
                        <TableHead>{t('orders.customer')}</TableHead>
                        <TableHead>{t('orders.product')}</TableHead>
                        <TableHead>{t('orders.total_amount')}</TableHead>
                        <TableHead>{t('orders.down_payment')}</TableHead>
                        <TableHead>{t('orders.installments')}</TableHead>
                        <TableHead>{t('orders.status')}</TableHead>
                        <TableHead>{t('orders.order_date')}</TableHead>
                        <TableHead>{t('orders.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              #{order.id}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.customer?.full_name}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.product?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('orders.quantity')}: {order.quantity}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(order.down_payment)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.installment_count} {t('products.months')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'completed' ? "default" :
                              order.status === 'active' ? "secondary" :
                              order.status === 'approved' ? "outline" :
                              "destructive"
                            }>
                              {t(`orders.${order.status}`, order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                              >
                                {t('orders.details')}
                              </Button>
                              {order.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(order)}
                                >
                                  {t('orders.approve')}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecordPayment(order)}
                              >
                                {t('orders.payment')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <OrderCardView orders={paginatedOrders} />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">{t('orders.no_orders_found')}</h3>
              <p className="text-muted-foreground">
                {t('orders.no_orders_description')}
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {Array.isArray(paginatedOrders) && paginatedOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-0 gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t('orders.showing', { 
                  from: Math.min(filteredAndSortedOrders.length, (page - 1) * pageSize + 1), 
                  to: Math.min(filteredAndSortedOrders.length, page * pageSize), 
                  total: filteredAndSortedOrders.length 
                })}
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">{t('orders.show')}:</label>
                <Select
                  value={pageSize.toString()}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                {t('orders.previous')}
              </Button>
              <Button variant="outline" size="sm" disabled>
                {t('orders.page')} {page} {t('orders.of')} {totalPages}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                {t('orders.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Order Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">
                {editingOrder ? t('orders.edit_order') : t('orders.create_new_order')}
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.customer')}</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="customer"
                        value={formData.customer}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">{t('orders.select_customer')}</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.product')}</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="product"
                        value={formData.product}
                        onChange={handleProductChange}
                        required
                      >
                        <option value="">{t('orders.select_product')}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.quantity')}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.total_amount_label')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.down_payment_label')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="down_payment"
                        value={formData.down_payment}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.installment_count')}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="installment_count"
                        value={formData.installment_count}
                        onChange={handleInputChange}
                        min="1"
                        max="60"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">{t('orders.monthly_payment')}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        value={formData.total_amount && formData.down_payment && formData.installment_count 
                          ? formatCurrency((formData.total_amount - formData.down_payment) / formData.installment_count)
                          : '$0.00'
                        }
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">{t('orders.notes')}</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={createOrderMutation.isLoading || updateOrderMutation.isLoading}
                >
                  {t('orders.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createOrderMutation.isLoading || updateOrderMutation.isLoading}
                >
                  {createOrderMutation.isLoading || updateOrderMutation.isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingOrder ? t('orders.updating') : t('orders.creating')}
                    </span>
                  ) : (
                    editingOrder ? t('orders.update_order') : t('orders.create_order_button')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowDetailsModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">{t('orders.order_details', { id: selectedOrder.id })}</h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h6 className="font-semibold mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {t('orders.customer_information')}
                  </h6>
                  <div className="space-y-2">
                    <p><strong>{t('orders.name')}:</strong> {selectedOrder.customer?.full_name}</p>
                    <p><strong>{t('orders.email')}:</strong> {selectedOrder.customer?.email || t('orders.na')}</p>
                    <p><strong>{t('orders.phone')}:</strong> {selectedOrder.customer?.phone_number || t('orders.na')}</p>
                  </div>
                </div>
                <div>
                  <h6 className="font-semibold mb-3 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    {t('orders.order_information')}
                  </h6>
                  <div className="space-y-2">
                    <p><strong>{t('orders.product')}:</strong> {selectedOrder.product?.name}</p>
                    <p><strong>{t('orders.quantity')}:</strong> {selectedOrder.quantity}</p>
                    <p><strong>{t('orders.status')}:</strong> 
                      <Badge variant={
                        selectedOrder.status === 'completed' ? "default" :
                        selectedOrder.status === 'active' ? "secondary" :
                        selectedOrder.status === 'approved' ? "outline" :
                        "destructive"
                      } className="ml-2">
                        {t(`orders.${selectedOrder.status}`, selectedOrder.status)}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h6 className="font-semibold mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    {t('orders.payment_information')}
                  </h6>
                  <div className="space-y-2">
                    <p><strong>{t('orders.total_amount')}:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                    <p><strong>{t('orders.down_payment')}:</strong> {formatCurrency(selectedOrder.down_payment)}</p>
                    <p><strong>{t('orders.monthly_payment_label')}:</strong> {formatCurrency(selectedOrder.monthly_payment || 0)}</p>
                    <p><strong>{t('orders.remaining_balance')}:</strong> {formatCurrency(selectedOrder.remaining_balance || 0)}</p>
                  </div>
                </div>
                <div>
                  <h6 className="font-semibold mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('orders.installment_plan')}
                  </h6>
                  <div className="space-y-2">
                    <p><strong>{t('orders.installments')}:</strong> {selectedOrder.installment_count} {t('products.months')}</p>
                    <p><strong>{t('orders.order_date')}:</strong> {formatDate(selectedOrder.order_date)}</p>
                    {selectedOrder.approved_date && (
                      <p><strong>{t('orders.approved_date')}:</strong> {formatDate(selectedOrder.approved_date)}</p>
                    )}
                    {selectedOrder.start_date && (
                      <p><strong>{t('orders.start_date_label')}:</strong> {formatDate(selectedOrder.start_date)}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mt-6">
                  <h6 className="font-semibold mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    {t('orders.notes')}
                  </h6>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.installments && selectedOrder.installments.length > 0 && (
                <div className="mt-6">
                  <h6 className="font-semibold mb-3">{t('orders.installment_schedule')}</h6>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('orders.installment_number')}</TableHead>
                          <TableHead>{t('orders.total_amount')}</TableHead>
                          <TableHead>{t('orders.due_date')}</TableHead>
                          <TableHead>{t('orders.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.installments.map((installment) => (
                          <TableRow key={installment.id}>
                            <TableCell>{installment.installment_number}</TableCell>
                            <TableCell>{formatCurrency(installment.amount)}</TableCell>
                            <TableCell>{formatDate(installment.due_date)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                installment.status === 'paid' ? "default" :
                                installment.status === 'overdue' ? "destructive" :
                                "outline"
                              }>
                                {t(`orders.${installment.status}`, installment.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                {t('orders.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">{t('orders.record_payment', { id: selectedOrder.id })}</h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">{t('orders.payment_amount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="amount"
                      value={paymentForm.amount}
                      onChange={handlePaymentChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">{t('orders.payment_method')}</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="payment_method"
                      value={paymentForm.payment_method}
                      onChange={handlePaymentChange}
                      required
                    >
                      <option value="cash">{t('orders.cash')}</option>
                      <option value="card">{t('orders.card')}</option>
                      <option value="bank_transfer">{t('orders.bank_transfer')}</option>
                      <option value="check">{t('orders.check')}</option>
                      <option value="other">{t('orders.other')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">{t('orders.reference_number')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="reference_number"
                      value={paymentForm.reference_number}
                      onChange={handlePaymentChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">{t('orders.notes')}</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="notes"
                      value={paymentForm.notes}
                      onChange={handlePaymentChange}
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={createPaymentMutation.isLoading}
                >
                  {t('orders.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createPaymentMutation.isLoading}
                >
                  {createPaymentMutation.isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('orders.recording')}
                    </span>
                  ) : (
                    t('orders.record_payment_button')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;