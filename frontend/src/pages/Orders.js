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
  const queryClient = useQueryClient();

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
      toast.success('Order created successfully!');
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create order');
    },
  });

  const updateOrderMutation = useMutation(
    ({ id, data }) => orderService.updateOrder(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('orders');
        queryClient.invalidateQueries('dashboardStats');
        toast.success('Order updated successfully!');
        setShowModal(false);
        setEditingOrder(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update order');
      },
    }
  );

  const approveOrderMutation = useMutation(orderService.approveOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      toast.success('Order approved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to approve order');
    },
  });

  const deleteOrderMutation = useMutation(orderService.deleteOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      toast.success('Order deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete order');
    },
  });

  const createPaymentMutation = useMutation(orderService.createPayment, {
    onSuccess: () => {
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries('dashboardStats');
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      resetPaymentForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
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
    if (window.confirm(`Are you sure you want to approve Order #${order.id}?`)) {
      approveOrderMutation.mutate(order.id);
    }
  };

  const handleDelete = (order) => {
    if (window.confirm(`Are you sure you want to delete Order #${order.id}?`)) {
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
      'Order ID': order.id,
      'Customer': order.customer?.full_name || 'N/A',
      'Product': order.product?.name || 'N/A',
      'Total Amount': order.total_amount,
      'Down Payment': order.down_payment,
      'Status': order.status,
      'Installments': order.installment_count,
      'Order Date': order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A',
      'Approved Date': order.approved_date ? new Date(order.approved_date).toLocaleDateString() : 'N/A'
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
    
    toast.success(`Orders exported as ${format.toUpperCase()} successfully!`);
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
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'active': return 'bg-primary';
      case 'approved': return 'bg-info';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  if (isLoading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="fade-in">
      {/* Enhanced Header */}
      <div className="gradient-bg text-white p-4 rounded-3 mb-4" style={{ borderRadius: '20px' }}>
        <div className="d-flex justify-content-between align-items-center">
    <div>
            <h1 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>
              📋 Orders Management
            </h1>
            <p className="mb-0" style={{ opacity: '0.9', fontSize: '1.1rem' }}>
              Manage orders, payments, and installment tracking with advanced analytics
            </p>
          </div>
          <div className="d-flex gap-2">
        <button
              className="btn-modern btn-modern-primary"
          onClick={() => {
            setEditingOrder(null);
            resetForm();
            setShowModal(true);
          }}
        >
              ➕ Create Order
        </button>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="card-modern slide-up mb-4">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">🔍 Search Orders</label>
              <input
                type="search"
                className="form-control"
                placeholder="Search by customer, product or order ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">📊 Sort By</label>
              <select
                className="form-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="order_date">Order Date</option>
                <option value="total_amount">Amount</option>
                <option value="customer">Customer</option>
                <option value="product">Product</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">🔄 Order</label>
              <select
                className="form-control"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">📈 Export</label>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleExport('csv')}
                  title="Export as CSV"
                >
                  CSV
                </button>
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => handleExport('json')}
                  title="Export as JSON"
                >
                  JSON
                </button>
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">🧹 Actions</label>
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={clearFilters}
                title="Clear all filters"
              >
                Clear Filters
              </button>
            </div>
            <div className="col-md-1">
              <label className="form-label">📊 Results</label>
              <div className="d-flex align-items-center h-100">
                <span className="badge-modern badge-info-modern">
                  {filteredAndSortedOrders.length}
                </span>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-2">
              <label className="form-label">📋 Status</label>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">👤 Customer</label>
              <select
                className="form-control"
                value={customerFilter}
                onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">📦 Product</label>
              <select
                className="form-control"
                value={productFilter}
                onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">📅 Start Date</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">📅 End Date</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">💰 Amount Range</label>
              <div className="d-flex gap-1">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Min"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                />
                <input
                  type="number"
                  className="form-control"
                  placeholder="Max"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="metric-card info slide-up">
              <div className="metric-value">{stats.orders?.total || 0}</div>
              <div className="metric-label">Total Orders</div>
              <div className="metric-subtext">
                {stats.orders?.active || 0} Active Orders
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card warning slide-up">
              <div className="metric-value">{stats.orders?.pending || 0}</div>
              <div className="metric-label">Pending Orders</div>
              <div className="metric-subtext">
                Requires approval
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card success slide-up">
              <div className="metric-value">{stats.orders?.active || 0}</div>
              <div className="metric-label">Active Orders</div>
              <div className="metric-subtext">
                In progress
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card danger slide-up">
              <div className="metric-value">{formatCurrency(stats.payments?.total_revenue || 0)}</div>
              <div className="metric-label">Total Revenue</div>
              <div className="metric-subtext">
                All time earnings
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Due Payments Alert */}
      {dueData && (dueData.due_today?.length > 0 || dueData.overdue?.length > 0) && (
        <div className="alert alert-warning mb-4">
          <h6>Payment Alerts</h6>
          {dueData.due_today?.length > 0 && (
            <p className="mb-1">
              <strong>{dueData.due_today.length}</strong> payments due today
            </p>
          )}
          {dueData.overdue?.length > 0 && (
            <p className="mb-0">
              <strong>{dueData.overdue.length}</strong> overdue payments
            </p>
          )}
        </div>
      )}

      {/* Enhanced Orders Table */}
      <div className="card-modern slide-up">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="chart-title">📋 Orders List</h6>
            <div className="d-flex align-items-center gap-2">
              <span className="badge-modern badge-info-modern">
                Showing {Math.min(filteredAndSortedOrders.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedOrders.length, page * pageSize)} of {filteredAndSortedOrders.length}
              </span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-modern">
              <thead>
                <tr>
                  <th>📋 Order ID</th>
                  <th>👤 Customer</th>
                  <th>📦 Product</th>
                  <th>💰 Total Amount</th>
                  <th>💳 Down Payment</th>
                  <th>📅 Installments</th>
                  <th>📊 Status</th>
                  <th>📅 Order Date</th>
                  <th>⚙️ Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(paginatedOrders) && paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="badge-modern badge-info-modern">
                          #{order.id}
                        </span>
                      </td>
                      <td>{order.customer?.full_name}</td>
                      <td>
                        <div>
                          <strong>{order.product?.name}</strong>
                          <br />
                          <small className="text-muted">Qty: {order.quantity}</small>
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold text-success">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td>{formatCurrency(order.down_payment)}</td>
                      <td>
                        <span className="badge-modern badge-warning-modern">
                          {order.installment_count} months
                        </span>
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
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleViewDetails(order)}
                            title="View Details"
                          >
                            📋 Details
                          </button>
                          {order.status === 'pending' && (
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleApprove(order)}
                              title="Approve Order"
                            >
                              ✅ Approve
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRecordPayment(order)}
                            title="Record Payment"
                          >
                            💰 Payment
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleEdit(order)}
                            title="Edit Order"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(order)}
                            title="Delete Order"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No Orders Found</div>
                        <div className="empty-state-text">
                          No orders match your current filters. Try adjusting your search criteria.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">Showing {Math.min(filteredAndSortedOrders.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedOrders.length, page * pageSize)} of {filteredAndSortedOrders.length} orders</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Prev</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>Next</button>
            </div>

            <select className="form-select form-select-sm" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Customer</label>
                      <select
                        className="form-control"
                        name="customer"
                        value={formData.customer}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select
                        className="form-control"
                        name="product"
                        value={formData.product}
                        onChange={handleProductChange}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="form-label">Total Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="form-label">Down Payment ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="down_payment"
                        value={formData.down_payment}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Installment Count (months)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="installment_count"
                        value={formData.installment_count}
                        onChange={handleInputChange}
                        min="1"
                        max="60"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Monthly Payment</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.total_amount && formData.down_payment && formData.installment_count 
                          ? formatCurrency((formData.total_amount - formData.down_payment) / formData.installment_count)
                          : '$0.00'
                        }
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createOrderMutation.isLoading || updateOrderMutation.isLoading}
                >
                  {createOrderMutation.isLoading || updateOrderMutation.isLoading
                    ? 'Saving...'
                    : editingOrder
                    ? 'Update Order'
                    : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">Order Details - #{selectedOrder.id}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {selectedOrder.customer?.full_name}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer?.email}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customer?.phone_number}</p>
                </div>
                <div className="col-md-6">
                  <h6>Order Information</h6>
                  <p><strong>Product:</strong> {selectedOrder.product?.name}</p>
                  <p><strong>Quantity:</strong> {selectedOrder.quantity}</p>
                  <p><strong>Status:</strong> 
                    <span className={`badge ${getStatusBadgeClass(selectedOrder.status)} ms-2`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-md-6">
                  <h6>Payment Information</h6>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                  <p><strong>Down Payment:</strong> {formatCurrency(selectedOrder.down_payment)}</p>
                  <p><strong>Monthly Payment:</strong> {formatCurrency(selectedOrder.monthly_payment)}</p>
                  <p><strong>Remaining Balance:</strong> {formatCurrency(selectedOrder.remaining_balance)}</p>
                </div>
                <div className="col-md-6">
                  <h6>Installment Plan</h6>
                  <p><strong>Installment Count:</strong> {selectedOrder.installment_count} months</p>
                  <p><strong>Order Date:</strong> {formatDate(selectedOrder.order_date)}</p>
                  {selectedOrder.approved_date && (
                    <p><strong>Approved Date:</strong> {formatDate(selectedOrder.approved_date)}</p>
                  )}
                  {selectedOrder.start_date && (
                    <p><strong>Start Date:</strong> {formatDate(selectedOrder.start_date)}</p>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mt-3">
                  <h6>Notes</h6>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.installments && selectedOrder.installments.length > 0 && (
                <div className="mt-4">
                  <h6>Installment Schedule</h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.installments.map((installment) => (
                          <tr key={installment.id}>
                            <td>{installment.installment_number}</td>
                            <td>{formatCurrency(installment.amount)}</td>
                            <td>{formatDate(installment.due_date)}</td>
                            <td>
                              <span className={`badge ${
                                installment.status === 'paid' ? 'bg-success' :
                                installment.status === 'overdue' ? 'bg-danger' :
                                'bg-warning'
                              }`}>
                                {installment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">Record Payment - Order #{selectedOrder.id}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-control"
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={handlePaymentChange}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="reference_number"
                    value={paymentForm.reference_number}
                    onChange={handlePaymentChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={paymentForm.notes}
                    onChange={handlePaymentChange}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPaymentMutation.isLoading}
                >
                  {createPaymentMutation.isLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
