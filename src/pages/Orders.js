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
  RemoveShoppingCart as RemoveItemIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import api, { apiServices } from '../services/api';

const ORDER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.APPROVED]: 'Approved',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled'
};

const Orders = () => {
  const { user } = useSelector(state => state.auth);
  const isCustomer = user?.role?.code === 'customer';
  const canManageOrders = hasPermission(user?.role, PERMISSIONS.MANAGE_ORDERS);
  const canCreateOrders = hasPermission(user?.role, PERMISSIONS.CREATE_ORDERS);

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
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
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formValidation, setFormValidation] = useState({
    customerValid: false,
    itemsValid: false
  });

  useEffect(() => {

    const fetchOrders = async () => {
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

        if (isCustomer && user?.customer_id) {
          params.customer_id = user.customer_id;
        }

        const response = await apiServices.orders.getAll(params);

        setOrders(response.data.data || []);
        setFilteredOrders(response.data.data || []);
        setTotalCount(response.data.pagination?.total || 0);
        setError(null);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Error loading orders: ' + (error.message || 'Unknown error'));
        setOrders([]);
        setFilteredOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [page, rowsPerPage, filters, user]);

  useEffect(() => {
    if (openNewOrderDialog) {
      const fetchCustomers = async () => {
        try {
          const response = await api.get('/customers');
          setCustomers(response.data.data || []);
        } catch (error) {
          console.error('Error fetching customers:', error);
          setSnackbar({
            open: true,
            message: 'Error loading customers: ' + (error.message || 'Unknown error'),
            severity: 'error'
          });
        }
      };

      const fetchProducts = async () => {
        try {
          const response = await api.get('/products');
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

      fetchCustomers();
      fetchProducts();
    }
  }, [openNewOrderDialog]);

  useEffect(() => {
    setFormValidation({
      customerValid: !!selectedCustomer,
      itemsValid: orderItems.length > 0
    });
  }, [selectedCustomer, orderItems]);

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
      const response = await api.get(`/orders/${order.id}`);
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

      await api.patch(`/orders/${orderId}/status`, { status: newStatus });

      setSnackbar({
        open: true,
        message: `Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`,
        severity: 'success'
      });

      const updatedOrders = orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      );

      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Error updating order status: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);

      await api.delete(`/orders/${orderId}`);

      setSnackbar({
        open: true,
        message: `Order cancelled successfully`,
        severity: 'success'
      });

      const updatedOrders = orders.map(order =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      );

      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      }

    } catch (error) {
      console.error('Error cancelling order:', error);
      setSnackbar({
        open: true,
        message: 'Error cancelling order: ' + (error.message || 'Unknown error'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    let color;

    switch (status) {
      case ORDER_STATUS.PENDING:
        color = 'warning';
        break;
      case ORDER_STATUS.APPROVED:
        color = 'info';
        break;
      case ORDER_STATUS.SHIPPED:
        color = 'primary';
        break;
      case ORDER_STATUS.DELIVERED:
        color = 'success';
        break;
      case ORDER_STATUS.CANCELLED:
        color = 'error';
        break;
      default:
        color = 'default';
    }

    return (
      <Chip
        label={ORDER_STATUS_LABELS[status] || status}
        color={color}
        size="small"
      />
    );
  };

  const getStatusActions = (order) => {
    if (!canManageOrders) return null;

    const { id, status } = order;

    switch (status) {
      case ORDER_STATUS.PENDING:
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Approve">
              <IconButton
                color="success"
                size="small"
                onClick={() => handleUpdateOrderStatus(id, ORDER_STATUS.APPROVED)}
              >
                <CheckIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reject">
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

      case ORDER_STATUS.APPROVED:
        return (
          <Tooltip title="Mark as Shipped">
            <IconButton
              color="primary"
              size="small"
              onClick={() => handleUpdateOrderStatus(id, ORDER_STATUS.SHIPPED)}
            >
              <ShippingIcon />
            </IconButton>
          </Tooltip>
        );

      case ORDER_STATUS.SHIPPED:
        return (
          <Tooltip title="Mark as Delivered">
            <IconButton
              color="success"
              size="small"
              onClick={() => handleUpdateOrderStatus(id, ORDER_STATUS.DELIVERED)}
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
    setSelectedCustomer(null);
    setOrderItems([]);
    setOpenNewOrderDialog(true);
  };

  const handleCloseNewOrderDialog = () => {
    setOpenNewOrderDialog(false);
  };

  const handleCustomerChange = (event, newValue) => {
    setSelectedCustomer(newValue);
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
    if (!selectedCustomer || orderItems.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select a customer and add at least one product',
        severity: 'error'
      });
      return;
    }

    try {
      const orderData = {
        customer_id: selectedCustomer.id,
        items: orderItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const response = await api.post('/orders', orderData);

      setSnackbar({
        open: true,
        message: 'Order created successfully',
        severity: 'success'
      });

      setTimeout(() => {
        const fetchOrders = async () => {
          try {
            const response = await api.get('/orders', {
              params: {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
              }
            });

            setOrders(response.data.data || []);
            setFilteredOrders(response.data.data || []);
            setTotalCount(response.data.pagination?.total || 0);
          } catch (error) {
            console.error('Error refreshing orders:', error);
          }
        };

        fetchOrders();
      }, 500);

      handleCloseNewOrderDialog();
    } catch (error) {
      console.error('Error creating order:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          {isCustomer ? 'My Orders' : 'Orders'}
        </Typography>

        {canCreateOrders && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenNewOrderDialog}
          >
            New Order
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
              label="Order ID or Customer"
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
                {Object.entries(ORDER_STATUS_LABELS).map(([key, value]) => (
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
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="center">Items Count</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((order) => (
                    <TableRow key={order.id}>
                      <TableCell component="th" scope="row">
                        {order.id}
                      </TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{getStatusChip(order.status)}</TableCell>
                      <TableCell align="right">
                        ${order.total_amount !== undefined ? order.total_amount : '0.00'}
                      </TableCell>
                      <TableCell align="center">{order.item_count}</TableCell>
                      <TableCell>{dayjs(order.date).format('MM/DD/YYYY HH:mm')}</TableCell>
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
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No orders found.
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
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
          />
        </Paper>
      )}

      {selectedOrder && (
        <Dialog open={orderDetailsDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Typography variant="h6">
              Order #{selectedOrder.order_number || selectedOrder.id}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Customer Information
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedOrder.customer_name}
                </Typography>
                {selectedOrder.customer_email && (
                  <Typography variant="body2">
                    Email: {selectedOrder.customer_email}
                  </Typography>
                )}
                {selectedOrder.customer_phone && (
                  <Typography variant="body2">
                    Phone: {selectedOrder.customer_phone}
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
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Payment Status
                      </Typography>
                      <Typography variant="body1">
                        {selectedOrder.payment_status}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Created By
                      </Typography>
                      <Typography variant="body1">
                        {selectedOrder.created_by_name || 'System'}
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
                        <TableCell align="right">Tax</TableCell>
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
                            ${parseFloat(item.tax_amount).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${parseFloat(item.total_price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} />
                        <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                          Subtotal
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(selectedOrder.subtotal).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2} />
                        <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                          Tax
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(selectedOrder.tax_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={2} />
                        <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
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
            {canManageOrders && (
              <>
                {selectedOrder.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleUpdateOrderStatus(selectedOrder.id, 'approved');
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
                {selectedOrder.status === 'approved' && (
                  <Button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, 'shipped');
                      handleCloseDialog();
                    }}
                    color="primary"
                  >
                    Mark as Shipped
                  </Button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <Button
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, 'delivered');
                      handleCloseDialog();
                    }}
                    color="primary"
                  >
                    Mark as Delivered
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
        <DialogTitle>Create New Order</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Customer Selection */}
            <Grid item xs={12}>
              <Autocomplete
                id="customer-select"
                options={customers}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                value={selectedCustomer}
                onChange={handleCustomerChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
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
                options={products.filter(p => p.stock_quantity > 0)}
                getOptionLabel={(option) => `${option.name} (${option.stock_quantity} in stock)`}
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
                            ${item.price}
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
            disabled={!formValidation.customerValid || !formValidation.itemsValid}
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

export default Orders; 