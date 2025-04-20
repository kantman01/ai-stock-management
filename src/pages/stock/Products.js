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
  LinearProgress
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
  CloudUpload as CloudUploadIcon
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
  }, [dispatch, page, rowsPerPage, searchTerm, filters, user]);

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
    
    const initialSupplier = isSupplier && user.supplierId ? user.supplierId : '';
    
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
      stock_quantity: item.stock_quantity || 0,
      min_stock_quantity: item.min_stock_quantity || 0,
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
          {isSupplier ? 'My Products' : 'Products Management'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isSupplier 
            ? 'View and manage your products in the inventory'
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
          <Grid item xs={12} sm={4}>
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

          <Grid item xs={12} sm={2.5}>
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

          <Grid item xs={12} sm={2.5}>
            <FormControl fullWidth>
              <InputLabel>Stock Status</InputLabel>
              <Select
                name="inStock"
                value={filters.inStock}
                label="Stock Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="inStock">In Stock</MenuItem>
                <MenuItem value="outOfStock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleClearFilters}
              size="medium"
              sx={{ flex: 1 }}
            >
              Clear
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
                Add Product
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>
      )}

      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress size={40} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'error.main' }}>
                      Error: {error}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
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
                      <TableCell align="right">
                        <Chip
                          label={item.stock_quantity}
                          color={getQuantityColor(item.stock_quantity)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.is_active ? 'Active' : 'Inactive'}
                          color={item.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          {isCustomer ? (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleOrderClick(item)}
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
                  label="Minimum Stock Level"
                  name="min_stock_quantity"
                  type="number"
                  value={formData.min_stock_quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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

      {/* Add Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={handleCloseOrderDialog}>
        <DialogTitle>Create Order</DialogTitle>
        <DialogContent>
          {selectedProductForOrder && (
            <>
              <Typography variant="h6">
                {selectedProductForOrder.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                SKU: {selectedProductForOrder.sku}
              </Typography>
              <Typography variant="body1">
                Price: ${selectedProductForOrder.price}
              </Typography>
              <TextField
                margin="dense"
                label="Quantity"
                type="number"
                fullWidth
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1 }}
                required
              />
              <Typography variant="body1" sx={{ mt: 2 }}>
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
    </Box>
  );
};

export default Products; 