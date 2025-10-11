import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const Customers = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [ageFilter, setAgeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
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

  // Enhanced filtering and sorting
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers;

    // Search filter
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((c) => {
        const name = (c.full_name || '').toString().toLowerCase();
        const email = (c.email || '').toString().toLowerCase();
        const phone = (c.phone_number || '').toString().toLowerCase();
        return name.includes(normalizedQuery) || email.includes(normalizedQuery) || phone.includes(normalizedQuery);
      });
    }

    // Age filter
    if (ageFilter) {
      filtered = filtered.filter((c) => {
        const age = calculateAge(c.date_of_birth);
        if (ageFilter === '18-25') return age >= 18 && age <= 25;
        if (ageFilter === '26-35') return age >= 26 && age <= 35;
        if (ageFilter === '36-50') return age >= 36 && age <= 50;
        if (ageFilter === '50+') return age >= 50;
        return true;
      });
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((c) => new Date(c.created_at) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((c) => new Date(c.created_at) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((c) => new Date(c.created_at) >= filterDate);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          filtered = filtered.filter((c) => new Date(c.created_at) >= filterDate);
          break;
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'full_name':
          aValue = a.full_name?.toLowerCase() || '';
          bValue = b.full_name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'age':
          aValue = calculateAge(a.date_of_birth);
          bValue = calculateAge(b.date_of_birth);
          break;
        default:
          aValue = a.full_name?.toLowerCase() || '';
          bValue = b.full_name?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [customers, searchQuery, ageFilter, dateFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCustomers.length / pageSize));
  const paginatedCustomers = filteredAndSortedCustomers.slice((page - 1) * pageSize, page * pageSize);

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

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = (format) => {
    const dataToExport = filteredAndSortedCustomers.map(customer => ({
      'Name': customer.full_name,
      'Email': customer.email,
      'Phone': customer.phone_number,
      'Age': calculateAge(customer.date_of_birth),
      'Address': customer.address,
      'Created Date': customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'
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
      a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success(`Customers exported as ${format.toUpperCase()} successfully!`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAgeFilter('');
    setDateFilter('');
    setSortBy('full_name');
    setSortOrder('asc');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database with advanced filtering and insights
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            resetForm();
            setShowModal(true);
          }}
        >
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Filter and search your customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age Group</label>
              <Select
                value={ageFilter}
                onChange={(e) => { setAgeFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Ages</option>
                <option value="18-25">18-25 years</option>
                <option value="26-35">26-35 years</option>
                <option value="36-50">36-50 years</option>
                <option value="50+">50+ years</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Registration Period</label>
              <Select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Size</label>
              <Select
                value={pageSize.toString()}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="full_name">Name</option>
                <option value="email">Email</option>
                <option value="age">Age</option>
                <option value="created_at">Created Date</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                  Export JSON
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {filteredAndSortedCustomers.length} customers found
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="metric-card info slide-up">
              <div className="metric-value">{stats.total_customers}</div>
              <div className="metric-label">Total Customers</div>
              <div className="metric-subtext">
                {stats.active_customers} Active Customers
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card success slide-up">
              <div className="metric-value">{stats.active_customers}</div>
              <div className="metric-label">Active Customers</div>
              <div className="metric-subtext">
                {((stats.active_customers / stats.total_customers) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card warning slide-up">
              <div className="metric-value">{stats.total_customers - stats.active_customers}</div>
              <div className="metric-label">Inactive Customers</div>
              <div className="metric-subtext">
                May need attention
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="metric-card danger slide-up">
              <div className="metric-value">{filteredAndSortedCustomers.length}</div>
              <div className="metric-label">Filtered Results</div>
              <div className="metric-subtext">
                Current view
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Customers Table */}
      <div className="card-modern slide-up">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="chart-title">👥 Customers List</h6>
            <div className="d-flex align-items-center gap-2">
              <span className="badge-modern badge-info-modern">
                Showing {Math.min(filteredAndSortedCustomers.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedCustomers.length, page * pageSize)} of {filteredAndSortedCustomers.length}
              </span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-modern">
              <thead>
                <tr>
                  <th>👤 Customer</th>
                  <th>📧 Email</th>
                  <th>📞 Phone</th>
                  <th>🎂 Age</th>
                  <th>📍 Address</th>
                  <th>📅 Created</th>
                  <th>⚙️ Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(paginatedCustomers) && paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer) => (
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
                      <td>
                        <span className="badge-modern badge-info-modern">
                          {calculateAge(customer.date_of_birth)} years
                        </span>
                      </td>
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
                            📋 Orders
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => generatePortalLink(customer)}
                            title="Copy Portal Link"
                          >
                            🔗 Portal
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleEdit(customer)}
                            title="Edit Customer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(customer)}
                            title="Delete Customer"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">No Customers Found</div>
                        <div className="empty-state-text">
                          No customers match your current filters. Try adjusting your search criteria.
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
            <small className="text-muted">Showing {Math.min(filteredAndSortedCustomers.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedCustomers.length, page * pageSize)} of {filteredAndSortedCustomers.length} customers</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Prev</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>Next</button>
            </div>
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
