import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { productService } from '../services/productService';
import { toast } from 'react-toastify';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Table as TableIcon, Grid } from 'lucide-react';

// View toggle component with Lucide icons
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

const Products = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [stockFilter, setStockFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsData, isLoading } = useQuery(
    'products',
    productService.getProducts,
    {
      refetchInterval: 30000,
    }
  );

  const products = productsData?.results || productsData || [];
  const { data: categoriesData } = useQuery('categories', productService.getCategories);
  const categories = categoriesData?.results || categoriesData || [];
  const { data: stats } = useQuery('productStats', productService.getProductStats);

  // Enhanced filtering and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const name = (p.name || '').toString().toLowerCase();
        const sku = (p.sku || '').toString().toLowerCase();
        const cat = (p.category_name || p.category?.name || '').toString().toLowerCase();
        return name.includes(normalizedQuery) || sku.includes(normalizedQuery) || cat.includes(normalizedQuery);
      });
    }

    if (statusFilter) {
      filtered = filtered.filter((p) => {
        if (statusFilter === 'active') return p.is_active;
        if (statusFilter === 'inactive') return !p.is_active;
        return true;
      });
    }

    if (categoryFilter) {
      filtered = filtered.filter((p) => {
        const categoryId = p.category?.id || p.category_id;
        return categoryId && categoryId.toString() === categoryFilter;
      });
    }

    if (priceRange.min !== '') {
      filtered = filtered.filter((p) => p.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max !== '') {
      filtered = filtered.filter((p) => p.price <= parseFloat(priceRange.max));
    }

    if (stockFilter) {
      if (stockFilter === 'in_stock') {
        filtered = filtered.filter((p) => p.stock_quantity > 0);
      } else if (stockFilter === 'out_of_stock') {
        filtered = filtered.filter((p) => p.stock_quantity === 0);
      } else if (stockFilter === 'low_stock') {
        filtered = filtered.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10);
      }
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'stock':
          aValue = a.stock_quantity || 0;
          bValue = b.stock_quantity || 0;
          break;
        case 'category':
          aValue = (a.category?.name || a.category_name || '').toLowerCase();
          bValue = (b.category?.name || b.category_name || '').toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchQuery, statusFilter, categoryFilter, priceRange, stockFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / pageSize));
  const paginatedProducts = filteredAndSortedProducts.slice((page - 1) * pageSize, page * pageSize);

  // Mutations
  const createProductMutation = useMutation(productService.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('productStats');
      toast.success('Product created successfully!');
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create product');
    },
  });

  const updateProductMutation = useMutation(
    ({ id, data }) => productService.updateProduct(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('productStats');
        toast.success('Product updated successfully!');
        setShowModal(false);
        setEditingProduct(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update product');
      },
    }
  );

  const deleteProductMutation = useMutation(productService.deleteProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('productStats');
      toast.success('Product deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete product');
    },
  });

  const createCategoryMutation = useMutation(productService.createCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      toast.success('Category created successfully!');
      setShowCategoryModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create category');
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    stock_quantity: '',
    category: '',
    min_installments: 1,
    max_installments: 12,
    is_active: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      sku: '',
      stock_quantity: '',
      category: '',
      min_installments: 1,
      max_installments: 12,
      is_active: true,
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      stock_quantity: parseInt(formData.stock_quantity),
      min_installments: parseInt(formData.min_installments),
      max_installments: parseInt(formData.max_installments),
      category: formData.category ? parseInt(formData.category) : null,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      sku: product.sku,
      stock_quantity: product.stock_quantity.toString(),
      category: product.category?.id?.toString() || '',
      min_installments: product.min_installments,
      max_installments: product.max_installments,
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    createCategoryMutation.mutate(categoryForm);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = (format) => {
    const dataToExport = filteredAndSortedProducts.map(product => ({
      'Product Name': product.name,
      'SKU': product.sku,
      'Category': product.category?.name || product.category_name || 'No Category',
      'Price': product.price,
      'Stock Quantity': product.stock_quantity,
      'Status': product.is_active ? 'Active' : 'Inactive',
      'Min Installments': product.min_installments,
      'Max Installments': product.max_installments,
      'Created Date': product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'
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
      a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success(`Products exported as ${format.toUpperCase()} successfully!`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriceRange({ min: '', max: '' });
    setStockFilter('');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Card View Component
  const ProductCardView = ({ products }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <Card key={product.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                <Badge variant={product.is_active ? "default" : "destructive"}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
              
              <div className="flex justify-between items-center">
                <span className="font-bold text-green-600">
                  {formatCurrency(product.price)}
                </span>
                <Badge variant={
                  product.stock_quantity > 10 ? "default" :
                  product.stock_quantity > 0 ? "destructive" :
                  "destructive"
                }>
                  Stock: {product.stock_quantity}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {product.category?.name || product.category_name || 'No Category'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {product.min_installments}-{product.max_installments}m
                </Badge>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  SKU: {product.sku}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg">Loading products...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your catalog, pricing and inventory
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Button
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
          >
            Add Category
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowModal(true);
            }}
          >
            Add Product
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
            Filter and search your products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by name, SKU or category..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock</label>
              <Select
                value={stockFilter}
                onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock (≤10)</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Price</label>
              <Input
                type="number"
                placeholder="Min price"
                value={priceRange.min}
                onChange={(e) => { setPriceRange(prev => ({ ...prev, min: e.target.value })); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Price</label>
              <Input
                type="number"
                placeholder="Max price"
                value={priceRange.max}
                onChange={(e) => { setPriceRange(prev => ({ ...prev, max: e.target.value })); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="category">Category</option>
                <option value="created">Created Date</option>
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
              {filteredAndSortedProducts.length} products found
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{stats.total_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                  <p className="text-2xl font-bold">{stats.active_products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.total_orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold">{stats.pending_orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>
                {viewMode === 'table' ? 'Products List' : 'Products Grid'}
              </CardTitle>
              <CardDescription>
                {viewMode === 'table' 
                  ? 'Manage your product catalog in table view' 
                  : 'Manage your product catalog in card view'
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
          {Array.isArray(paginatedProducts) && paginatedProducts.length > 0 ? (
            <div className="space-y-4">
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Installments</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">{product.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {product.sku}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.category?.name || product.category_name || 'No Category'}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(product.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              product.stock_quantity > 10 ? "default" :
                              product.stock_quantity > 0 ? "destructive" :
                              "destructive"
                            }>
                              {product.stock_quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.min_installments} - {product.max_installments} months
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "destructive"}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(product)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <ProductCardView products={paginatedProducts} />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground">
                No products match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {Array.isArray(paginatedProducts) && paginatedProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-0 gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min(filteredAndSortedProducts.length, (page - 1) * pageSize + 1)} - {Math.min(filteredAndSortedProducts.length, page * pageSize)} of {filteredAndSortedProducts.length} products
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Show:</label>
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

      {/* Product Modal */}
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
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Product Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">SKU</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Stock Quantity</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="stock_quantity"
                      value={formData.stock_quantity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Category</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Min Installments</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="min_installments"
                      value={formData.min_installments}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Max Installments</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="max_installments"
                      value={formData.max_installments}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                      required
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                      />
                      <span className="text-sm font-medium">Active Product</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end p-6 border-t space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={createProductMutation.isLoading || updateProductMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createProductMutation.isLoading || updateProductMutation.isLoading}
              >
                {createProductMutation.isLoading || updateProductMutation.isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingProduct ? 'Updating...' : 'Creating...'}
                  </span>
                ) : (
                  editingProduct ? 'Update Product' : 'Create Product'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setShowCategoryModal(false)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h5 className="text-xl font-semibold">Add New Category</h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                onClick={() => setShowCategoryModal(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Category Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="name"
                    value={categoryForm.name}
                    onChange={handleCategoryChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryChange}
                    rows="3"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end p-6 border-t space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCategoryModal(false)}
                disabled={createCategoryMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCategorySubmit}
                disabled={createCategoryMutation.isLoading || !categoryForm.name.trim()}
              >
                {createCategoryMutation.isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Category'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;