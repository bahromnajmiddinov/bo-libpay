import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { toast } from 'react-toastify';

const Orders = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Orders Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingOrder(null);
            resetForm();
            setShowModal(true);
          }}
        >
          Create Order
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-primary">{stats.orders?.total || 0}</h3>
                <p className="text-muted">Total Orders</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-warning">{stats.orders?.pending || 0}</h3>
                <p className="text-muted">Pending Orders</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-info">{stats.orders?.active || 0}</h3>
                <p className="text-muted">Active Orders</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-success">{formatCurrency(stats.payments?.total_revenue || 0)}</h3>
                <p className="text-muted">Total Revenue</p>
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

      {/* Orders Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Total Amount</th>
                  <th>Down Payment</th>
                  <th>Installments</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(orders) && orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                      </td>
                      <td>{order.customer?.full_name}</td>
                      <td>
                        <div>
                          <strong>{order.product?.name}</strong>
                          <br />
                          <small className="text-muted">Qty: {order.quantity}</small>
                        </div>
                      </td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>{formatCurrency(order.down_payment)}</td>
                      <td>{order.installment_count} months</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
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
                            Details
                          </button>
                          {order.status === 'pending' && (
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleApprove(order)}
                              title="Approve Order"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRecordPayment(order)}
                            title="Record Payment"
                          >
                            Payment
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleEdit(order)}
                            title="Edit Order"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(order)}
                            title="Delete Order"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-4">
                      No orders found. Click "Create Order" to create your first order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
