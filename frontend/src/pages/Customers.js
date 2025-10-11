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
import { Table as TableIcon, Grid, User, Mail, Phone, MapPin, Calendar, Package, CreditCard } from 'lucide-react';

// View toggle component
const ViewToggle = ({ view, onChange }) => (
  <div className="flex items-center space-x-1 border rounded-lg p-1 bg-gray-50">
    <button
      onClick={() => onChange('table')}
      className={`p-2 rounded-md transition-colors ${
        view === 'table' 
          ? 'bg-white shadow-sm border' 
          : 'hover:bg-gray-100'
      }`}
      title="Table View"
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
      title="Card View"
    >
      <Grid size={18} />
    </button>
  </div>
);

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
  const [viewMode, setViewMode] = useState('table');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  // Card View Component
  const CustomerCardView = ({ customers }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map((customer) => (
        <Card key={customer.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{customer.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer #{customer.id}
                  </p>
                </div>
                <Badge variant="outline">
                  {calculateAge(customer.date_of_birth)} yrs
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail size={16} className="text-muted-foreground" />
                  <a 
                    href={`mailto:${customer.email}`}
                    className="text-sm hover:text-blue-600 transition-colors"
                  >
                    {customer.email}
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone size={16} className="text-muted-foreground" />
                  <a 
                    href={`tel:${customer.phone_number}`}
                    className="text-sm hover:text-blue-600 transition-colors"
                  >
                    {customer.phone_number}
                  </a>
                </div>
                {customer.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin size={16} className="text-muted-foreground mt-0.5" />
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {customer.address}
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span>{formatDate(customer.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOrders(customer)}
                >
                  Orders
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generatePortalLink(customer)}
                >
                  Portal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(customer)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(customer)}
                >
                  Delete
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
        <div className="text-lg">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database with advanced filtering and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ViewToggle view={viewMode} onChange={setViewMode} />
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
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <span>Filters & Search</span>
          <span>{showMobileFilters ? '▲' : '▼'}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className={`${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium">Page Size</label>
              <Select
                value={pageSize.toString()}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Badge variant="secondary">
              {filteredAndSortedCustomers.length} customers found
            </Badge>
            <div className="text-sm text-muted-foreground lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                Close Filters
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
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{stats.total_customers}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.active_customers} Active Customers
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
                  <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                  <p className="text-2xl font-bold">{stats.active_customers}</p>
                  <p className="text-xs text-muted-foreground">
                    {((stats.active_customers / stats.total_customers) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <User className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inactive Customers</p>
                  <p className="text-2xl font-bold">{stats.total_customers - stats.active_customers}</p>
                  <p className="text-xs text-muted-foreground">
                    May need attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-bold">{filteredAndSortedCustomers.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Current view
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>
                {viewMode === 'table' ? 'Customers List' : 'Customers Grid'}
              </CardTitle>
              <CardDescription>
                {viewMode === 'table' 
                  ? 'Manage your customers in table view' 
                  : 'Manage your customers in card view'
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                View:
              </span>
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Array.isArray(paginatedCustomers) && paginatedCustomers.length > 0 ? (
            <div className="space-y-4">
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.full_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`mailto:${customer.email}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {customer.email}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`tel:${customer.phone_number}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {customer.phone_number}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {calculateAge(customer.date_of_birth)} years
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-xs truncate">
                              {customer.address}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(customer.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewOrders(customer)}
                              >
                                Orders
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generatePortalLink(customer)}
                              >
                                Portal
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(customer)}
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <CustomerCardView customers={paginatedCustomers} />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">No Customers Found</h3>
              <p className="text-muted-foreground">
                No customers match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {Array.isArray(paginatedCustomers) && paginatedCustomers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-0 gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min(filteredAndSortedCustomers.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedCustomers.length, page * pageSize)} of {filteredAndSortedCustomers.length} customers
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Page {page} of {totalPages}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                      <label className="block text-sm font-medium">First Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Last Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Phone Number</label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Address</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Date of Birth (Optional)</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
                >
                  {createCustomerMutation.isLoading || updateCustomerMutation.isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingCustomer ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingCustomer ? 'Update Customer' : 'Create Customer'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && selectedCustomer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowOrdersModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">
                Orders for {selectedCustomer.full_name}
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowOrdersModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {ordersLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-lg">Loading orders...</div>
                </div>
              ) : customerOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Installments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              #{order.id}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.product?.name}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'completed' ? "default" :
                              order.status === 'active' ? "secondary" :
                              order.status === 'approved' ? "outline" :
                              "destructive"
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.order_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.installment_count} months
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📦</div>
                  <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground">
                    This customer doesn't have any orders yet.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowOrdersModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;