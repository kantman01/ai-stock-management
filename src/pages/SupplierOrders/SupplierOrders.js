import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip,
  Alert,
  Grid,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Tooltip,
  Autocomplete,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as ShippingIcon,
  Payment as PaymentIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  AddShoppingCart as AddItemIcon,
  RemoveShoppingCart as RemoveItemIcon,
  LocalShipping
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/roles';
import { PERMISSIONS } from '../../utils/roles';
import { apiServices } from '../../services/api';

const SUPPLIER_ORDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const SUPPLIER_ORDER_STATUS_LABELS = {
  [SUPPLIER_ORDER_STATUS.PENDING]: 'Pending',
  [SUPPLIER_ORDER_STATUS.APPROVED]: 'Approved',
  [SUPPLIER_ORDER_STATUS.SHIPPED]: 'Shipped',
  [SUPPLIER_ORDER_STATUS.DELIVERED]: 'Delivered',
  [SUPPLIER_ORDER_STATUS.COMPLETED]: 'Completed',
  [SUPPLIER_ORDER_STATUS.CANCELLED]: 'Cancelled'
};

const SupplierOrders = () => {
  const { user } = useSelector(state => state.auth);
  const canManageInventory = hasPermission(user?.role, PERMISSIONS.MANAGE_INVENTORY);

  const [supplierOrders, setSupplierOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: null,
    endDate: null
  });

  const [orderDetailsDialog, setOrderDetailsDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [openNewOrderDialog, setOpenNewOrderDialog] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formValidation, setFormValidation] = useState({
    supplierValid: false,
    itemsValid: false
  });

  useEffect(() => {
    fetchSupplierOrders();
  }, [page, rowsPerPage, filters]);

  const fetchSupplierOrders = async () => {
    setLoading(true);
    try {

      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: filters.search || undefined,
        status: filters.status || undefined,
        start_date: filters.startDate ? dayjs(filters.startDate).format('YYYY-MM-DD') : undefined,
        end_date: filters.endDate ? dayjs(filters.endDate).format('YYYY-MM-DD') : undefined
      };

      const response = await apiServices.supplierOrders.getAll(params);

      setSupplierOrders(response.data.data || []);
      setTotalCount(response.data.pagination?.total || 0);
      setError(null);
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      setError('Error loading supplier orders: ' + (error.message || 'Unknown error'));
      setSupplierOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openNewOrderDialog) {
      const fetchSuppliers = async () => {
        try {
          const response = await apiServices.suppliers.getAll();
          setSuppliers(response.data.data || []);
        } catch (error) {
          console.error('Error fetching suppliers:', error);
          setSnackbar({
            open: true,
            message: 'Error loading suppliers: ' + (error.message || 'Unknown error'),
            severity: 'error'
          });
        }
      };

      const fetchProducts = async () => {
        try {
          const response = await apiServices.products.getAll();
          setProducts(response.data.data || []);
        } catch (error) {
          console.error('Error fetching products:', error);
          setSnackbar({
            open: true,
            message: 'Error loading products: ' + (error.message || 'Unknown error'),
            severity: 'error'
          });
        }
      };

      fetchSuppliers();
      fetchProducts();
    }
  }, [openNewOrderDialog]);

  useEffect(() => {
    setFormValidation({
      supplierValid: !!selectedSupplier,
      itemsValid: orderItems.length > 0
    });
  }, [selectedSupplier, orderItems]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date
    });
  };

  const handleViewOrder = async (order) => {
    try {
      setLoading(true);
      const response = await apiServices.supplierOrders.getById(order.id);
      setSelectedOrder(response.data);
      setOrderDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSnackbar({
        open: true,
        message: 'Error loading order details: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOrderDetailsDialog(false);
    setSelectedOrder(null);
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);

      if (newStatus === SUPPLIER_ORDER_STATUS.COMPLETED) {

        const orderCheck = await apiServices.supplierOrders.getById(orderId);
        if (orderCheck.data.status !== SUPPLIER_ORDER_STATUS.DELIVERED) {
          setSnackbar({
            open: true,
            message: 'Order must be in delivered status before it can be completed.',
            severity: 'error'
          });
          return;
        }

        await apiServices.supplierOrders.complete(orderId);

        setSnackbar({
          open: true,
          message: `Order completed and items added to inventory`,
          severity: 'success'
        });
      } else {

        await apiServices.supplierOrders.updateStatus(orderId, newStatus);

        setSnackbar({
          open: true,
          message: `Order status updated to ${SUPPLIER_ORDER_STATUS_LABELS[newStatus]}`,
          severity: 'success'
        });
      }

      fetchSupplierOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = await apiServices.supplierOrders.getById(orderId);
        setSelectedOrder(updatedOrder.data);
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Error updating order status: ' + (error.response?.data?.message || error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);

      await apiServices.supplierOrders.delete(orderId);

      setSnackbar({
        open: true,
        message: `Order cancelled successfully`,
        severity: 'success'
      });

      fetchSupplierOrders();

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: SUPPLIER_ORDER_STATUS.CANCELLED });
      }

    } catch (error) {
      console.error('Error cancelling order:', error);
      setSnackbar({
        open: true,
        message: 'Error cancelling order: ' + (error.response?.data?.message || error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    let color;

    switch (status) {
      case SUPPLIER_ORDER_STATUS.PENDING:
        color = 'warning';
        break;
      case SUPPLIER_ORDER_STATUS.APPROVED:
        color = 'info';
        break;
      case SUPPLIER_ORDER_STATUS.SHIPPED:
        color = 'primary';
        break;
      case SUPPLIER_ORDER_STATUS.DELIVERED:
        color = 'secondary';
        break;
      case SUPPLIER_ORDER_STATUS.COMPLETED:
        color = 'success';
        break;
      case SUPPLIER_ORDER_STATUS.CANCELLED:
        color = 'error';
        break;
      default:
        color = 'default';
    }

    return (
      <Chip
        label={SUPPLIER_ORDER_STATUS_LABELS[status] || status}
        color={color}
        size="small"
      />
    );
  };

  const getStatusActions = (order) => {
    if (!canManageInventory) return null;

    const { id, status } = order;

    switch (status) {
      case SUPPLIER_ORDER_STATUS.PENDING:
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Approve">
              <IconButton
                color="success"
                size="small"
                onClick={() => handleUpdateOrderStatus(id, SUPPLIER_ORDER_STATUS.APPROVED)}
              >
                <CheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton
                color="error"
                size="small"
                onClick={() => handleCancelOrder(id)}
              >
                <CancelIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        );

      case SUPPLIER_ORDER_STATUS.APPROVED:
        return (
          <Tooltip title="Mark as Shipped">
            <IconButton
              color="primary"
              size="small"
              onClick={() => handleUpdateOrderStatus(id, SUPPLIER_ORDER_STATUS.SHIPPED)}
            >
              <ShippingIcon />
            </IconButton>
          </Tooltip>
        );

      case SUPPLIER_ORDER_STATUS.SHIPPED:
        return (
          <Tooltip title="Mark as Delivered">
            <IconButton
              color="secondary"
              size="small"
              onClick={() => handleUpdateOrderStatus(id, SUPPLIER_ORDER_STATUS.DELIVERED)}
            >
              <ShippingIcon />
            </IconButton>
          </Tooltip>
        );

      case SUPPLIER_ORDER_STATUS.DELIVERED:
        return (
          <Tooltip title="Complete & Add to Inventory">
            <IconButton
              color="success"
              size="small"
              onClick={() => handleUpdateOrderStatus(id, SUPPLIER_ORDER_STATUS.COMPLETED)}
            >
              <CheckIcon />
            </IconButton>
          </Tooltip>
        );

      default:
        return null;
    }
  };

  const handleOpenNewOrderDialog = () => {
    setSelectedSupplier(null);
    setOrderItems([]);
    setOpenNewOrderDialog(true);
  };

  const handleCloseNewOrderDialog = () => {
    setOpenNewOrderDialog(false);
  };

  const handleSupplierChange = (event, newValue) => {
    setSelectedSupplier(newValue);
  };

  const handleAddProduct = (product) => {
    const existingItemIndex = orderItems.findIndex(item => item.id === product.id);

    if (existingItemIndex >= 0) {

      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      setOrderItems(updatedItems);
    } else {

      setOrderItems([...orderItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setOrderItems(orderItems.filter(item => item.id !== productId));
  };

  const handleQuantityChange = (productId, quantity) => {
    const newQuantity = Math.max(1, parseInt(quantity) || 1);

    setOrderItems(orderItems.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateOrderTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier || orderItems.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select a supplier and add at least one product',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        supplier_id: selectedSupplier.id,
        items: orderItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      await apiServices.supplierOrders.create(orderData);

      setSnackbar({
        open: true,
        message: 'Supplier order created successfully',
        severity: 'success'
      });

      fetchSupplierOrders();

      handleCloseNewOrderDialog();
    } catch (error) {
      console.error('Error creating supplier order:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Error creating supplier order',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Supplier Orders
        </Typography>

        {canManageInventory && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenNewOrderDialog}
          >
            New Purchase Order
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Filters
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name="search"
              label="Order ID or Supplier"
              variant="outlined"
              fullWidth
              value={filters.search}
              onChange={handleFilterChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filters.status}
                label="Status"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(SUPPLIER_ORDER_STATUS_LABELS).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
                <Typography variant="body2">-</Typography>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Stack>
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%' }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="center">Items Count</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell component="th" scope="row">
                      {order.id}
                    </TableCell>
                    <TableCell>{order.supplier_name}</TableCell>
                    <TableCell>{getStatusChip(order.status)}</TableCell>
                    <TableCell align="right">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell align="center">{order.item_count}</TableCell>
                    <TableCell>{dayjs(order.created_at).format('MM/DD/YYYY HH:mm')}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Details">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleViewOrder(order)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {getStatusActions(order)}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {supplierOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No supplier orders found.
                    </TableCell>
                  </TableRow>
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
        </Paper>
      )}

      {selectedOrder && (
        <Dialog open={orderDetailsDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Typography variant="h6">
              Supplier Order #{selectedOrder.id}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Supplier Information
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedOrder.supplier_name}
                </Typography>
                {selectedOrder.supplier_email && (
                  <Typography variant="body2">
                    Email: {selectedOrder.supplier_email}
                  </Typography>
                )}
                {selectedOrder.supplier_phone && (
                  <Typography variant="body2">
                    Phone: {selectedOrder.supplier_phone}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Order Information
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getStatusChip(selectedOrder.status)}
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="body1">
                        {dayjs(selectedOrder.created_at).format('MM/DD/YYYY HH:mm')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Order Items
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items && selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            ${parseFloat(item.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${parseFloat(item.total_price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} />
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          Total
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ${parseFloat(selectedOrder.total_amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {selectedOrder.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {selectedOrder.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            {canManageInventory && (
              <>
                {selectedOrder.status === SUPPLIER_ORDER_STATUS.PENDING && (
                  <>
                    <Button
                      onClick={() => {
                        handleUpdateOrderStatus(selectedOrder.id, SUPPLIER_ORDER_STATUS.APPROVED);
                        handleCloseDialog();
                      }}
                      color="success"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        handleCancelOrder(selectedOrder.id);
                        handleCloseDialog();
                      }}
                      color="error"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {selectedOrder.status === SUPPLIER_ORDER_STATUS.APPROVED && (
                  <Button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, SUPPLIER_ORDER_STATUS.SHIPPED);
                      handleCloseDialog();
                    }}
                    color="primary"
                  >
                    Mark as Shipped
                  </Button>
                )}
                {selectedOrder.status === SUPPLIER_ORDER_STATUS.SHIPPED && (
                  <Button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, SUPPLIER_ORDER_STATUS.DELIVERED);
                      handleCloseDialog();
                    }}
                    color="primary"
                  >
                    Mark as Delivered
                  </Button>
                )}
                {selectedOrder.status === SUPPLIER_ORDER_STATUS.DELIVERED && (
                  <Button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, SUPPLIER_ORDER_STATUS.COMPLETED);
                      handleCloseDialog();
                    }}
                    color="success"
                  >
                    Complete & Add to Inventory
                  </Button>
                )}
              </>
            )}
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* New Order Dialog */}
      <Dialog open={openNewOrderDialog} onClose={handleCloseNewOrderDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Supplier Order</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Supplier Selection */}
            <Grid item xs={12}>
              <Autocomplete
                id="supplier-select"
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={selectedSupplier}
                onChange={handleSupplierChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Supplier"
                    required
                    variant="outlined"
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Product Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Add Products
              </Typography>
              <Autocomplete
                id="product-select"
                options={products}
                getOptionLabel={(option) => `${option.name} ($${option.price})`}
                onChange={(event, newValue) => newValue && handleAddProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Products"
                    variant="outlined"
                    fullWidth
                  />
                )}
                value={null}
              />
            </Grid>

            {/* Order Items List */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Order Items
              </Typography>
              {orderItems.length === 0 ? (
                <Alert severity="info">No items added to order yet</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              InputProps={{ inputProps: { min: 1 } }}
                              size="small"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              sx={{ width: '70px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            ${parseFloat(item.price).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${(item.price * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleRemoveProduct(item.id)}
                            >
                              <RemoveItemIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                          Total
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ${calculateOrderTotal().toFixed(2)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewOrderDialog}>Cancel</Button>
          <Button
            onClick={handleCreateOrder}
            variant="contained"
            color="primary"
            disabled={!formValidation.supplierValid || !formValidation.itemsValid}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierOrders; 