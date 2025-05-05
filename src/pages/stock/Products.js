import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Image as ImageIcon,
  CloudUpload as CloudUploadIcon,
  ArrowUpward as IncreaseIcon,
  ArrowDownward as DecreaseIcon,
  SwapHoriz as TransferIcon,
  ShoppingCart as OrderIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import {
  fetchStockStart,
  fetchStockSuccess,
  fetchStockFailure,
  selectItem,
  setSearchTerm,
  setFilter,
  clearFilters
} from '../../redux/slices/stockSlice';

import api from '../../services/api';
import { productApiUtils } from '../../utils/apiUtils';

const Products = () => {
  const dispatch = useDispatch();
  const { items, filteredItems, isLoading, error, searchTerm, filters } = useSelector(state => state.stock);
  const { user } = useSelector(state => state.auth);
  const isSupplier = user?.role?.code === 'supplier';
  const isCustomer = user?.role?.code === 'customer';
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    price: 0,
    cost_price: 0,
    tax_rate: 0,
    stock_quantity: 0,
    min_stock_quantity: 0,
    is_active: true,
    image_url: ''
  });

  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  const [supplierProductsDialogOpen, setSupplierProductsDialogOpen] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [supplierProductsLoading, setSupplierProductsLoading] = useState(false);
  const [supplierProductsPagination, setSupplierProductsPagination] = useState({
    page: 0,
    rowsPerPage: 10,
    totalCount: 0
  });
  const [supplierProductsSearch, setSupplierProductsSearch] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [supplierOrderFormData, setSupplierOrderFormData] = useState({
    supplier_id: '',
    items: [],
    notes: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories', {
          params: {
            is_active: true
          }
        });
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setApiError('Categories could not be loaded');
      }
    };

    const fetchSuppliers = async () => {
      try {
        const response = await api.get('/suppliers', {
          params: {
            is_active: true
          }
        });
        setSuppliers(response.data.data);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setApiError('Suppliers could not be loaded');
      }
    };

    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      dispatch(fetchStockStart());

      try {
        
        const baseParams = {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          search: searchTerm || undefined,
          category_id: filters.category !== 'all' ? filters.category : undefined,
          min_stock: filters.inStock === 'inStock' ? 1 : undefined,
          max_stock: filters.inStock === 'outOfStock' ? 0 : undefined,
          sort_by: 'name',
          sort_dir: 'ASC'
        };

        
        if (isCustomer) {
          baseParams.min_stock = 1; 
          
          
        }
        
        const params = productApiUtils.getListParams(baseParams);

        const response = await api.get('/products', { params });

        dispatch(fetchStockSuccess(response.data.data));
        setTotalCount(response.data.pagination.total);
        setApiError(null);
      } catch (error) {
        console.error('Error fetching products:', error);
        dispatch(fetchStockFailure(error.message));
        setApiError('Products could not be loaded');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [dispatch, page, rowsPerPage, searchTerm, filters, user, isCustomer]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (e) => {
    dispatch(setSearchTerm(e.target.value));
    setPage(0);
  };

  const handleFilterChange = (e) => {
    dispatch(setFilter({
      name: e.target.name,
      value: e.target.value
    }));
    setPage(0);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setPage(0);
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    try {
      await api.delete(`/products/${itemToDelete.id}`);

      dispatch(fetchStockSuccess(items.filter(item => item.id !== itemToDelete.id)));

      setNotification({
        open: true,
        message: 'Product deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      setApiError('Product could not be deleted');
      setNotification({
        open: true,
        message: 'Error deleting product',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleAddClick = () => {
    if (isSupplier) {
      
      const initialSupplier = user.supplierId ? user.supplierId : '';
      
      setFormData({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category_id: '',
        supplier_id: initialSupplier,
        price: 0,
        cost_price: 0,
        tax_rate: 0,
        stock_quantity: 0,
        min_stock_quantity: 0,
        is_active: true,
        image_url: ''
      });
      setAddDialogOpen(true);
    } else {
      
      handleOpenSupplierProductsDialog();
    }
  };

  const getImageUrl = (imagePath) => {
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    
    if (!imagePath) return null;
    
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    
    return `${apiBaseUrl}${imagePath}`;
  };

  const handleEditClick = (item) => {
    
    const supplierId = isSupplier && user.supplierId ? user.supplierId : (item.supplier_id || '');
    
    setFormData({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      category_id: item.category_id || '',
      supplier_id: supplierId,
      price: item.price || 0,
      cost_price: item.cost_price || 0,
      tax_rate: item.tax_rate || 0,
      stock_quantity: isSupplier ? (item.supplier_stock_quantity || 0) : (item.stock_quantity || 0),
      min_stock_quantity: isSupplier ? (item.supplier_min_stock_quantity || 0) : (item.min_stock_quantity || 0),
      is_active: item.is_active,
      image_url: item.image_url || ''
    });
    
    
    if (item.image_url) {
      setImagePreview(getImageUrl(item.image_url));
    } else {
      setImagePreview('');
    }
    
    setEditDialogOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox'
        ? checked
        : ['price', 'cost_price', 'tax_rate', 'stock_quantity', 'min_stock_quantity'].includes(name)
          ? parseFloat(value)
          : value
    });
  };

  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setApiError('Only JPEG, PNG, GIF and WEBP images are allowed');
        return;
      }
      
      
      if (file.size > 5 * 1024 * 1024) {
        setApiError('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setApiError(null);
    }
  };

  
  const uploadImage = async (file) => {
    if (!file) return null;
    
    const formData = new FormData();
    
    formData.append('image', file);
    
    try {
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      };
      
      const response = await api.post('/products/upload-image', formData, config);
      setUploadProgress(0);
      return response.data.fullImageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setApiError('Failed to upload image: ' + (error.response?.data?.message || error.message));
      setUploadProgress(0);
      return null;
    }
  };

  const handleAddSubmit = async () => {
    
    if (!formData.name || formData.price <= 0) {
      setApiError('Please fill in required fields.');
      return;
    }
    
    if (!isSupplier && !formData.supplier_id) {
      setApiError('Selecting a supplier is required.');
      return;
    }
    
    setLoading(true);
    try {
      
      let imageUrl = formData.image_url;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          setApiError('Failed to upload product image');
          setLoading(false);
          return;
        }
      }
      
      
      const productData = {
        ...formData,
        image_url: imageUrl
      };
      
      const response = await api.post('/products', productData);

      dispatch(fetchStockSuccess([...items, response.data]));

      setNotification({
        open: true,
        message: 'Product added successfully',
        severity: 'success'
      });
      
      
      setImageFile(null);
      setImagePreview('');
      
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      setApiError(error.response?.data?.message || 'Product could not be added');
      setNotification({
        open: true,
        message: 'Error adding product',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    
    if (!formData.name || formData.price <= 0) {
      setApiError('Please fill in required fields.');
      return;
    }
    
    if (!isSupplier && !formData.supplier_id) {
      setApiError('Selecting a supplier is required.');
      return;
    }
    
    setLoading(true);
    try {
      
      let imageUrl = formData.image_url;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          setApiError('Failed to upload product image');
          setLoading(false);
          return;
        }
      }
      
      
      const productData = {
        ...formData,
        image_url: imageUrl
      };
      
      const response = await api.put(`/products/${formData.id}`, productData);

      dispatch(fetchStockSuccess(
        items.map(item => item.id === formData.id ? response.data : item)
      ));

      setNotification({
        open: true,
        message: 'Product updated successfully',
        severity: 'success'
      });
      
      
      setImageFile(null);
      setImagePreview('');
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating product:', error);
      setApiError(error.response?.data?.message || 'Product could not be updated');
      setNotification({
        open: true,
        message: 'Error updating product',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setAddDialogOpen(false);
    
    setImageFile(null);
    setImagePreview('');
    setUploadProgress(0);
  };

  const handleNotificationClose = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const getQuantityColor = (quantity) => {
    if (quantity <= 0) return 'error';
    if (quantity <= 5) return 'warning';
    return 'success';
  };

  const renderHeader = () => {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isSupplier ? 'My Products' : 
           isCustomer ? 'Available Products' : 
           'Products Management'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isSupplier 
            ? 'View and manage your products in the inventory'
            : isCustomer
            ? 'Browse and order products from our inventory'
            : 'View and manage all products in the inventory'
          }
        </Typography>
      </Box>
    );
  };

  const handleOrderClick = (product) => {
    setSelectedProductForOrder(product);
    setOrderQuantity(1);
    setOrderDialogOpen(true);
  };
  
  const handleCloseOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedProductForOrder(null);
  };
  
  const handleCreateOrder = async () => {
    try {
      if (!selectedProductForOrder) return;
      
      
      const orderData = {
        customer_id: user.customerId,
        items: [
          {
            product_id: selectedProductForOrder.id,
            quantity: orderQuantity
          }
        ],
        notes: `Order created from product page for ${selectedProductForOrder.name}`
      };
      
      const response = await api.post('/orders', orderData);
      
      
      setOrderDialogOpen(false);
      setNotification({
        open: true,
        message: 'Order created successfully',
        severity: 'success'
      });
      
      
      if (response.data && response.data.id) {
        navigate(`/orders/${response.data.id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setNotification({
        open: true,
        message: `Failed to create order: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    }
  };

  
  const fetchSupplierProducts = async () => {
    setSupplierProductsLoading(true);
    try {
      const params = {
        limit: supplierProductsPagination.rowsPerPage,
        offset: supplierProductsPagination.page * supplierProductsPagination.rowsPerPage,
        search: supplierProductsSearch || undefined,
        supplier_id: selectedSupplierFilter || undefined
      };

      const response = await api.get('/products/all-supplier-products', { params });
      setSupplierProducts(response.data.data);
      setSupplierProductsPagination({
        ...supplierProductsPagination,
        totalCount: response.data.pagination.total
      });
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setApiError('Supplier products could not be loaded');
    } finally {
      setSupplierProductsLoading(false);
    }
  };

  
  useEffect(() => {
    if (supplierProductsDialogOpen) {
      fetchSupplierProducts();
    }
  }, [
    supplierProductsDialogOpen, 
    supplierProductsPagination.page, 
    supplierProductsPagination.rowsPerPage,
    supplierProductsSearch,
    selectedSupplierFilter
  ]);

  
  const handleSupplierProductsChangePage = (event, newPage) => {
    setSupplierProductsPagination({
      ...supplierProductsPagination,
      page: newPage
    });
  };

  const handleSupplierProductsChangeRowsPerPage = (event) => {
    setSupplierProductsPagination({
      ...supplierProductsPagination,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0
    });
  };

  const handleOpenSupplierProductsDialog = () => {
    setSupplierProductsSearch('');
    setSelectedSupplierFilter('');
    setSupplierOrderFormData({
      supplier_id: '',
      items: [],
      notes: ''
    });
    setSupplierProductsDialogOpen(true);
  };

  const handleCloseSupplierProductsDialog = () => {
    setSupplierProductsDialogOpen(false);
  };

  const handleSupplierProductSearch = (e) => {
    setSupplierProductsSearch(e.target.value);
    setSupplierProductsPagination({
      ...supplierProductsPagination,
      page: 0
    });
  };

  const handleSupplierFilterChange = (e) => {
    setSelectedSupplierFilter(e.target.value);
    setSupplierProductsPagination({
      ...supplierProductsPagination,
      page: 0
    });
  };

  const handleAddToOrder = (product) => {
    const existingItemIndex = supplierOrderFormData.items.findIndex(
      item => item.product_id === product.id
    );

    if (existingItemIndex >= 0) {
      
      const updatedItems = [...supplierOrderFormData.items];
      updatedItems[existingItemIndex].quantity += 1;
      setSupplierOrderFormData({
        ...supplierOrderFormData,
        items: updatedItems,
        supplier_id: product.supplier_id
      });
    } else {
      
      setSupplierOrderFormData({
        ...supplierOrderFormData,
        supplier_id: product.supplier_id,
        items: [
          ...supplierOrderFormData.items,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price || 0
          }
        ]
      });
    }
  };

  const handleRemoveFromOrder = (productId) => {
    setSupplierOrderFormData({
      ...supplierOrderFormData,
      items: supplierOrderFormData.items.filter(item => item.product_id !== productId)
    });
  };

  const handleChangeQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    
    const updatedItems = supplierOrderFormData.items.map(item => 
      item.product_id === productId 
        ? { ...item, quantity } 
        : item
    );
    
    setSupplierOrderFormData({
      ...supplierOrderFormData,
      items: updatedItems
    });
  };

  const handleCreateSupplierOrder = async () => {
    if (supplierOrderFormData.items.length === 0) {
      setApiError('Please add at least one product to the order');
      return;
    }

    try {
      const orderData = {
        supplier_id: supplierOrderFormData.supplier_id,
        items: supplierOrderFormData.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        notes: supplierOrderFormData.notes,
        status: 'pending'
      };

      const response = await api.post('/supplier-orders', orderData);
      
      
      handleCloseSupplierProductsDialog();
      
      
      setPage(0);
      
      setNotification({
        open: true,
        message: 'Supplier order created successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating supplier order:', error);
      setApiError('Failed to create supplier order: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {renderHeader()}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={isCustomer ? 5 : 4}>
            <TextField
              fullWidth
              label="Search Products"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => dispatch(setSearchTerm(''))}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>

          <Grid item xs={12} sm={isCustomer ? 3.5 : 2.5}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={filters.category}
                label="Category"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={isCustomer ? 3.5 : 2.5}>
            <FormControl fullWidth>
              <InputLabel>Availability</InputLabel>
              <Select
                name="inStock"
                value={filters.inStock}
                label="Availability"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Products</MenuItem>
                <MenuItem value="inStock">In Stock</MenuItem>
                {!isCustomer && (
                  <MenuItem value="outOfStock">Out of Stock</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={isCustomer ? 12 : 3} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleClearFilters}
              size="medium"
              sx={{ flex: isCustomer ? 'none' : 1 }}
            >
              Clear Filters
            </Button>

            {!isCustomer && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
                size="medium"
                sx={{ flex: 1 }}
              >
                {isSupplier ? 'Add Product' : 'New Order'}
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>
      )}

      {isCustomer && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {items.length} products. Click the "Order" button to place an order for any available product.
        </Typography>
      )}

      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  {!isCustomer && (
                    <TableCell align="right">{isSupplier ? 'My Stock' : 'Warehouse Stock'}</TableCell>
                  )}
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">{isCustomer ? 'Availability' : 'Status'}</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isCustomer ? 7 : 8} align="center">
                      <CircularProgress size={40} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={isCustomer ? 7 : 8} align="center" sx={{ color: 'error.main' }}>
                      Error: {error}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isCustomer ? 7 : 8} align="center">
                      {searchTerm || filters.category !== 'all' || filters.inStock !== 'all'
                        ? 'No products match your search criteria.'
                        : 'No products have been added yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image_url ? (
                          <Avatar
                            src={getImageUrl(item.image_url)}
                            alt={item.name}
                            variant="rounded"
                            sx={{ width: 50, height: 50 }}
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = '/placeholder-image.jpg';
                            }}
                          />
                        ) : (
                          <Avatar 
                            variant="rounded" 
                            sx={{ width: 50, height: 50, bgcolor: 'grey.200' }}
                          >
                            <ImageIcon color="disabled" />
                          </Avatar>
                        )}
                      </TableCell>
                      <TableCell component="th" scope="row">
                        {item.name}
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      {!isCustomer && (
                        <TableCell align="right">
                          <Chip
                            label={isSupplier ? (item.supplier_stock_quantity || 0) : item.stock_quantity}
                            color={getQuantityColor(isSupplier ? (item.supplier_stock_quantity || 0) : item.stock_quantity)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      )}
                      <TableCell align="right">${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        {isCustomer ? (
                          <Chip
                            label={item.stock_quantity > 0 ? 'Available' : 'Out of Stock'}
                            color={item.stock_quantity > 0 ? 'success' : 'error'}
                            size="small"
                          />
                        ) : (
                          <Chip
                            label={item.is_active ? 'Active' : 'Inactive'}
                            color={item.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          {isCustomer ? (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleOrderClick(item)}
                              disabled={item.stock_quantity <= 0}
                            >
                              Order
                            </Button>
                          ) : (
                            <>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditClick(item)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(item)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Rows per page:"
          />
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Are you sure you want to delete this product?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You are about to delete the product "{itemToDelete?.name}". This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            autoFocus
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Image upload section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Image
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 2,
                    mb: 2 
                  }}
                >
                  {/* Image preview */}
                  <Box 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      border: '1px dashed grey', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.50'
                    }}
                  >
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    ) : (
                      <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                    )}
                  </Box>
                  
                  {/* Upload button and info */}
                  <Box sx={{ flex: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 1 }}
                    >
                      Upload Image
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg, image/png, image/gif, image/webp"
                        onChange={handleImageChange}
                      />
                    </Button>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Supported formats: JPEG, PNG, GIF, WEBP. Max size: 5MB
                    </Typography>
                    
                    {uploadProgress > 0 && (
                      <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                      </Box>
                    )}
                    
                    <TextField
                      fullWidth
                      label="Image URL"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      size="small"
                      sx={{ mt: 1 }}
                      helperText="Enter a URL or upload an image"
                    />
                  </Box>
                </Box>
              </Grid>
              
              {/* Product Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              
              {/* Category */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    label="Category"
                    onChange={handleInputChange}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Supplier - only show if not a supplier user */}
              {!isSupplier && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Supplier</InputLabel>
                    <Select
                      name="supplier_id"
                      value={formData.supplier_id}
                      label="Supplier"
                      onChange={handleInputChange}
                      error={!formData.supplier_id}
                    >
                      <MenuItem value="">Select a supplier</MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {!formData.supplier_id && (
                      <FormHelperText error>Supplier is required</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Cost Price"
                  name="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tax Rate (%)"
                  name="tax_rate"
                  type="number"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Initial Stock Quantity"
                  name="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Stock Level"
                  name="min_stock_quantity"
                  type="number"
                  value={formData.min_stock_quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="is_active"
                    value={formData.is_active}
                    label="Status"
                    onChange={(e) => setFormData({
                      ...formData,
                      is_active: e.target.value === 'true'
                    })}
                  >
                    <MenuItem value={'true'}>Active</MenuItem>
                    <MenuItem value={'false'}>Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleAddSubmit}
            color="primary"
            variant="contained"
            disabled={loading || !formData.name || formData.price <= 0 || (!isSupplier && !formData.supplier_id)}
          >
            {loading ? <CircularProgress size={24} /> : "Add Product"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={handleCloseOrderDialog}>
        <DialogTitle>Place New Order</DialogTitle>
        <DialogContent>
          {selectedProductForOrder && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                {selectedProductForOrder.image_url ? (
                  <Avatar
                    src={getImageUrl(selectedProductForOrder.image_url)}
                    alt={selectedProductForOrder.name}
                    variant="rounded"
                    sx={{ width: 80, height: 80 }}
                  />
                ) : (
                  <Avatar 
                    variant="rounded" 
                    sx={{ width: 80, height: 80, bgcolor: 'grey.200' }}
                  >
                    <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                  </Avatar>
                )}
                <Box>
                  <Typography variant="h6">
                    {selectedProductForOrder.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    SKU: {selectedProductForOrder.sku}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Category: {selectedProductForOrder.category_name}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Price: ${parseFloat(selectedProductForOrder.price).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Available stock: {selectedProductForOrder.stock_quantity}
              </Typography>
              
              <TextField
                margin="dense"
                label="Quantity"
                type="number"
                fullWidth
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedProductForOrder.stock_quantity)))}
                inputProps={{ min: 1, max: selectedProductForOrder.stock_quantity }}
                required
                helperText={`Maximum available: ${selectedProductForOrder.stock_quantity}`}
                sx={{ mt: 2 }}
              />
              <Typography variant="h6" sx={{ mt: 3, fontWeight: 'bold' }}>
                Total: ${(selectedProductForOrder.price * orderQuantity).toFixed(2)}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateOrder} 
            variant="contained" 
            color="primary"
          >
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Image upload section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Image
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 2,
                    mb: 2 
                  }}
                >
                  {/* Image preview */}
                  <Box 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      border: '1px dashed grey', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.50'
                    }}
                  >
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    ) : (
                      <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                    )}
                  </Box>
                  
                  {/* Upload button and info */}
                  <Box sx={{ flex: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 1 }}
                    >
                      Upload Image
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg, image/png, image/gif, image/webp"
                        onChange={handleImageChange}
                      />
                    </Button>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Supported formats: JPEG, PNG, GIF, WEBP. Max size: 5MB
                    </Typography>
                    
                    {uploadProgress > 0 && (
                      <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                      </Box>
                    )}
                    
                    <TextField
                      fullWidth
                      label="Image URL"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      size="small"
                      sx={{ mt: 1 }}
                      helperText="Enter a URL or upload an image"
                    />
                  </Box>
                </Box>
              </Grid>
              
              {/* Product Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              
              {/* Category */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    label="Category"
                    onChange={handleInputChange}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Supplier - only show if not a supplier user */}
              {!isSupplier && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Supplier</InputLabel>
                    <Select
                      name="supplier_id"
                      value={formData.supplier_id}
                      label="Supplier"
                      onChange={handleInputChange}
                      error={!formData.supplier_id}
                    >
                      <MenuItem value="">Select a supplier</MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {!formData.supplier_id && (
                      <FormHelperText error>Supplier is required</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Cost Price"
                  name="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tax Rate (%)"
                  name="tax_rate"
                  type="number"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Initial Stock Quantity"
                  name="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Minimum Stock Level"
                  name="min_stock_quantity"
                  type="number"
                  value={formData.min_stock_quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="is_active"
                    value={formData.is_active}
                    label="Status"
                    onChange={(e) => setFormData({
                      ...formData,
                      is_active: e.target.value === 'true'
                    })}
                  >
                    <MenuItem value={'true'}>Active</MenuItem>
                    <MenuItem value={'false'}>Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            color="primary"
            variant="contained"
            disabled={loading || !formData.name || formData.price <= 0 || (!isSupplier && !formData.supplier_id)}
          >
            {loading ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Products Dialog for Admin Users */}
      <Dialog
        open={supplierProductsDialogOpen}
        onClose={handleCloseSupplierProductsDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Order Products from Suppliers
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Search and filter */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Search products by name, SKU or barcode"
                value={supplierProductsSearch}
                onChange={handleSupplierProductSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Filter by Supplier</InputLabel>
                <Select
                  value={selectedSupplierFilter}
                  onChange={handleSupplierFilterChange}
                  label="Filter by Supplier"
                >
                  <MenuItem value="">All Suppliers</MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Supplier products table */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ height: 400, overflow: 'auto' }}>
                {supplierProductsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <TableContainer>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {supplierProducts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                No products found
                              </TableCell>
                            </TableRow>
                          ) : (
                            supplierProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {product.image_url && (
                                      <Box 
                                        component="img" 
                                        src={getImageUrl(product.image_url)}
                                        alt={product.name}
                                        sx={{ width: 40, height: 40, mr: 2, objectFit: 'contain' }}
                                      />
                                    )}
                                    <Box>
                                      <Typography variant="body2" fontWeight="bold">
                                        {product.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        SKU: {product.sku}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>{product.supplier_name}</TableCell>
                                <TableCell align="right">
                                  ${parseFloat(product.price).toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleAddToOrder(product)}
                                    disabled={
                                      supplierOrderFormData.supplier_id && 
                                      supplierOrderFormData.supplier_id !== product.supplier_id
                                    }
                                  >
                                    Add
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={supplierProductsPagination.totalCount}
                      rowsPerPage={supplierProductsPagination.rowsPerPage}
                      page={supplierProductsPagination.page}
                      onPageChange={handleSupplierProductsChangePage}
                      onRowsPerPageChange={handleSupplierProductsChangeRowsPerPage}
                    />
                  </>
                )}
              </Paper>
            </Grid>

            {/* Order summary */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                
                {supplierOrderFormData.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No products added to order yet. Click "Add" next to products to include them.
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Supplier: {suppliers.find(s => s.id === supplierOrderFormData.supplier_id)?.name}
                    </Typography>
                    
                    <List dense>
                      {supplierOrderFormData.items.map((item) => (
                        <ListItem
                          key={item.product_id}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="remove"
                              onClick={() => handleRemoveFromOrder(item.product_id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={item.product_name}
                            secondary={`$${parseFloat(item.unit_price).toFixed(2)} × ${item.quantity} = $${(item.unit_price * item.quantity).toFixed(2)}`}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                            <IconButton 
                              size="small"
                              onClick={() => handleChangeQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                            >
                              <DecreaseIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                            <IconButton 
                              size="small"
                              onClick={() => handleChangeQuantity(item.product_id, item.quantity + 1)}
                            >
                              <IncreaseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" align="right">
                      Total: ${supplierOrderFormData.items.reduce((sum, item) => 
                        sum + (item.unit_price * item.quantity), 0).toFixed(2)}
                    </Typography>
                    
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Order Notes"
                      value={supplierOrderFormData.notes}
                      onChange={(e) => setSupplierOrderFormData({
                        ...supplierOrderFormData,
                        notes: e.target.value
                      })}
                      sx={{ mt: 2 }}
                    />
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSupplierProductsDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateSupplierOrder}
            disabled={supplierOrderFormData.items.length === 0}
            startIcon={<OrderIcon />}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products; 