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
import { useTranslation } from 'react-i18next';

// View toggle component with Lucide icons
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
        title={t('products.table_view', 'Table View')}
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
        title={t('products.card_view', 'Card View')}
      >
        <Grid size={18} />
      </button>
    </div>
  );
};

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
  const { t } = useTranslation();

  // Fetch products
  const { data: productsData, isLoading } = useQuery(
    'products',
    productService.getProducts,
    {
      refetchInterval: 30000,
    }
  );

  // Products ni useMemo ichiga olamiz
  const products = useMemo(() => 
    productsData?.results || productsData || [], 
    [productsData]
  );
  
  // Fetch categories
  const { data: categoriesData } = useQuery('categories', productService.getCategories);
  
  // Categories ni ham useMemo ichiga olamiz
  const categories = useMemo(() => 
    categoriesData?.results || categoriesData || [], 
    [categoriesData]
  );
  
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

    // TO'G'RILANGAN KATEGORIYA FILTERI
    if (categoryFilter) {
      filtered = filtered.filter((product) => {
        // Turli xil kategoriya strukturalarini qo'llab-quvvatlash
        const productCategoryId = product.category?.id || product.category_id;
        const categoryId = parseInt(categoryFilter);
        
        return productCategoryId === categoryId;
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

  // Mutations (o'zgarmagan)
  const createProductMutation = useMutation(productService.createProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('productStats');
      toast.success(t('products.product_created', 'Product created successfully!'));
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('products.create_failed', 'Failed to create product'));
    },
  });

  const updateProductMutation = useMutation(
    ({ id, data }) => productService.updateProduct(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('productStats');
        toast.success(t('products.product_updated', 'Product updated successfully!'));
        setShowModal(false);
        setEditingProduct(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('products.update_failed', 'Failed to update product'));
      },
    }
  );

  const deleteProductMutation = useMutation(productService.deleteProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries('products');
      queryClient.invalidateQueries('productStats');
      toast.success(t('products.product_deleted', 'Product deleted successfully!'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('products.delete_failed', 'Failed to delete product'));
    },
  });

  const createCategoryMutation = useMutation(productService.createCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      toast.success(t('products.category_created', 'Category created successfully!'));
      setShowCategoryModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t('products.category_failed', 'Failed to create category'));
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
      category: product.category?.id?.toString() || product.category_id?.toString() || '',
      min_installments: product.min_installments,
      max_installments: product.max_installments,
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(t('products.delete_confirm', `Are you sure you want to delete "${product.name}"?`))) {
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
      [t('products.product_name')]: product.name,
      [t('products.sku')]: product.sku,
      [t('products.category')]: product.category?.name || product.category_name || t('products.no_category', 'No Category'),
      [t('products.price')]: product.price,
      [t('products.stock_quantity')]: product.stock_quantity,
      [t('products.status')]: product.is_active ? t('products.active') : t('products.inactive'),
      [t('products.min_installments')]: product.min_installments,
      [t('products.max_installments')]: product.max_installments,
      [t('products.created_date')]: product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'
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
    
    toast.success(t('products.export_success', `Products exported as ${format.toUpperCase()} successfully!`));
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
                  {product.is_active ? t('products.active') : t('products.inactive')}
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
                  {t('products.stock')}: {product.stock_quantity}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {product.category?.name || product.category_name || t('products.no_category', 'No Category')}
                </span>
                <Badge variant="outline" className="text-xs">
                  {product.min_installments}-{product.max_installments}{t('products.months')}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {t('products.sku')}: {product.sku}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    {t('products.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product)}
                  >
                    {t('products.delete')}
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
      <div className="text-lg">{t('loading', 'Loading products...')}</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">
            {t('products.description')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ViewToggle view={viewMode} onChange={setViewMode} />
          <Button
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
          >
            {t('products.add_category')}
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowModal(true);
            }}
          >
            {t('products.add_product')}
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
          <span>{t('products.filters_search')}</span>
          <span>{showMobileFilters ? '▲' : '▼'}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className={`${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
        <CardHeader>
          <CardTitle>{t('products.filters_search')}</CardTitle>
          <CardDescription>
            {t('products.filters_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.search')}</label>
              <Input
                placeholder={t('products.search_placeholder')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.status')}</label>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('products.all_status')}</option>
                <option value="active">{t('products.active')}</option>
                <option value="inactive">{t('products.inactive')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.category')}</label>
              <Select
                value={categoryFilter}
                onChange={(e) => { 
                  setCategoryFilter(e.target.value); 
                  setPage(1); 
                }}
              >
                <option value="">{t('products.all_categories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.stock')}</label>
              <Select
                value={stockFilter}
                onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('products.all_stock')}</option>
                <option value="in_stock">{t('products.in_stock')}</option>
                <option value="out_of_stock">{t('products.out_of_stock')}</option>
                <option value="low_stock">{t('products.low_stock')}</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.min_price')}</label>
              <Input
                type="number"
                placeholder={t('products.min_price')}
                value={priceRange.min}
                onChange={(e) => { setPriceRange(prev => ({ ...prev, min: e.target.value })); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.max_price')}</label>
              <Input
                type="number"
                placeholder={t('products.max_price')}
                value={priceRange.max}
                onChange={(e) => { setPriceRange(prev => ({ ...prev, max: e.target.value })); setPage(1); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.sort_by')}</label>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">{t('products.name')}</option>
                <option value="price">{t('products.price')}</option>
                <option value="stock">{t('products.stock_quantity')}</option>
                <option value="category">{t('products.category')}</option>
                <option value="created">{t('products.created_date')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.order')}</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="asc">{t('products.ascending')}</option>
                <option value="desc">{t('products.descending')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('products.actions')}</label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t('products.clear')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  {t('products.export_csv')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                  {t('products.export_json')}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Badge variant="secondary">
              {t('products.products_found', { count: filteredAndSortedProducts.length })}
            </Badge>
            <div className="text-sm text-muted-foreground lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                {t('products.close_filters')}
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
                  <p className="text-sm font-medium text-muted-foreground">{t('products.total_products')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('products.active_products')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('products.total_orders')}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">{t('products.pending_orders')}</p>
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
                {viewMode === 'table' ? t('products.products_list') : t('products.products_grid')}
              </CardTitle>
              <CardDescription>
                {viewMode === 'table' 
                  ? t('products.table_view_description') 
                  : t('products.card_view_description')
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {t('products.view', 'View')}:
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
                        <TableHead>{t('products.product_name')}</TableHead>
                        <TableHead>{t('products.sku')}</TableHead>
                        <TableHead>{t('products.category')}</TableHead>
                        <TableHead>{t('products.price')}</TableHead>
                        <TableHead>{t('products.stock_quantity')}</TableHead>
                        <TableHead>{t('products.installments')}</TableHead>
                        <TableHead>{t('products.status')}</TableHead>
                        <TableHead>{t('products.actions')}</TableHead>
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
                            {product.category?.name || product.category_name || t('products.no_category', 'No Category')}
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
                              {product.min_installments} - {product.max_installments} {t('products.months')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "destructive"}>
                              {product.is_active ? t('products.active') : t('products.inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                {t('products.edit')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(product)}
                              >
                                {t('products.delete')}
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
              <h3 className="text-lg font-semibold mb-2">{t('products.no_products_found')}</h3>
              <p className="text-muted-foreground">
                {t('products.no_products_description')}
              </p>
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {Array.isArray(paginatedProducts) && paginatedProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 pt-0 gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {t('products.showing', { 
                  from: Math.min(filteredAndSortedProducts.length, (page - 1) * pageSize + 1), 
                  to: Math.min(filteredAndSortedProducts.length, page * pageSize), 
                  total: filteredAndSortedProducts.length 
                })}
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">{t('products.show')}:</label>
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
                {t('products.previous')}
              </Button>
              <Button variant="outline" size="sm" disabled>
                {t('products.page')} {page} {t('products.of')} {totalPages}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                {t('products.next')}
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
                {editingProduct ? t('products.edit_product') : t('products.add_new_product')}
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
                    <label className="block text-sm font-medium">{t('products.product_name')}</label>
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
                    <label className="block text-sm font-medium">{t('products.sku')}</label>
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
                  <label className="block text-sm font-medium">{t('products.description')}</label>
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
                    <label className="block text-sm font-medium">{t('products.price')} ($)</label>
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
                    <label className="block text-sm font-medium">{t('products.stock_quantity')}</label>
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
                    <label className="block text-sm font-medium">{t('products.category')}</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">{t('products.select_category', 'Select Category')}</option>
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
                    <label className="block text-sm font-medium">{t('products.min_installments')}</label>
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
                    <label className="block text-sm font-medium">{t('products.max_installments')}</label>
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
                      <span className="text-sm font-medium">{t('products.active_product', 'Active Product')}</span>
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
                {t('products.cancel')}
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
                    {editingProduct ? t('products.updating') : t('products.creating')}
                  </span>
                ) : (
                  editingProduct ? t('products.update_product') : t('products.create_product')
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
              <h5 className="text-xl font-semibold">{t('products.add_new_category')}</h5>
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
                  <label className="block text-sm font-medium">{t('products.category_name')}</label>
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
                  <label className="block text-sm font-medium">{t('products.description')}</label>
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
                {t('products.cancel')}
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
                    {t('products.creating_category')}
                  </span>
                ) : (
                  t('products.create_category')
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