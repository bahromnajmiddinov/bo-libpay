import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import { toast } from 'react-toastify';

const Customers = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customersData, isLoading } = useQuery(
    'customers',
    customerService.getCustomers,
    {
      refetchInterval: 30000,
    }
  );

  // Extract customers array from paginated response
  const customers = customersData?.results || customersData || [];

  // Customer stats
  const { data: stats } = useQuery(
    'customerStats',
    customerService.getCustomerStats
  );

  // Customer orders (when modal is open)
  const { data: customerOrders = [], isLoading: ordersLoading } = useQuery(
    ['customerOrders', selectedCustomer?.id],
    () => customerService.getCustomerOrders(selectedCustomer.id),
    {
      enabled: !!selectedCustomer?.id,
    }
  );

  // Mutations
  const createCustomerMutation = useMutation(customerService.createCustomer, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      queryClient.invalidateQueries('customerStats');
      toast.success('Customer created successfully!');
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create customer');
    },
  });

  const updateCustomerMutation = useMutation(
    ({ id, data }) => customerService.updateCustomer(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        queryClient.invalidateQueries('customerStats');
        toast.success('Customer updated successfully!');
        setShowModal(false);
        setEditingCustomer(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update customer');
      },
    }
  );

  const deleteCustomerMutation = useMutation(customerService.deleteCustomer, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      queryClient.invalidateQueries('customerStats');
      toast.success('Customer deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete customer');
    },
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      date_of_birth: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      date_of_birth: formData.date_of_birth || null,
    };

    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: submitData });
    } else {
      createCustomerMutation.mutate(submitData);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone_number: customer.phone_number,
      address: customer.address,
      date_of_birth: customer.date_of_birth || '',
    });
    setShowModal(true);
  };

  const handleDelete = (customer) => {
    if (window.confirm(`Are you sure you want to delete "${customer.full_name}"?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  const handleViewOrders = (customer) => {
    setSelectedCustomer(customer);
    setShowOrdersModal(true);
  };

  const generatePortalLink = (customer) => {
    const portalUrl = `${window.location.origin}/customer-portal/${customer.id}`;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied to clipboard!');
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

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return <div className="loading">Loading customers...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Customers Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingCustomer(null);
            resetForm();
            setShowModal(true);
          }}
        >
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-primary">{stats.total_customers}</h3>
                <p className="text-muted">Total Customers</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <h3 className="text-success">{stats.active_customers}</h3>
                <p className="text-muted">Active Customers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Age</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(customers) && customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div>
                          <strong>{customer.full_name}</strong>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${customer.email}`} className="text-decoration-none">
                          {customer.email}
                        </a>
                      </td>
                      <td>
                        <a href={`tel:${customer.phone_number}`} className="text-decoration-none">
                          {customer.phone_number}
                        </a>
                      </td>
                      <td>{calculateAge(customer.date_of_birth)} years</td>
                      <td>
                        <small className="text-muted">{customer.address}</small>
                      </td>
                      <td>{formatDate(customer.created_at)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewOrders(customer)}
                            title="View Orders"
                          >
                            Orders
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => generatePortalLink(customer)}
                            title="Copy Portal Link"
                          >
                            Portal
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleEdit(customer)}
                            title="Edit Customer"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(customer)}
                            title="Delete Customer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No customers found. Click "Add Customer" to create your first customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    className="form-control"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
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
                  disabled={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                >
                  {createCustomerMutation.isLoading || updateCustomerMutation.isLoading
                    ? 'Saving...'
                    : editingCustomer
                    ? 'Update Customer'
                    : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowOrdersModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">
                Orders for {selectedCustomer.full_name}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowOrdersModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {ordersLoading ? (
                <div className="loading">Loading orders...</div>
              ) : customerOrders.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Product</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                        <th>Order Date</th>
                        <th>Installments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.product?.name}</td>
                          <td>{formatCurrency(order.total_amount)}</td>
                          <td>
                            <span className={`badge ${
                              order.status === 'completed' ? 'bg-success' :
                              order.status === 'active' ? 'bg-primary' :
                              order.status === 'approved' ? 'bg-info' :
                              'bg-warning'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{formatDate(order.order_date)}</td>
                          <td>{order.installment_count} months</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  No orders found for this customer.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowOrdersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
