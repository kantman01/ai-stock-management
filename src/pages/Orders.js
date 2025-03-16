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
  Autocomplete
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
  CANCELED: 'CANCELED'
};


const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.APPROVED]: 'Approved',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELED]: 'Canceled'
};

const Orders = () => {
  const { user } = useSelector(state => state.auth);
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
  
  useEffect(() => {
    
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await apiServices.orders.getAll({
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          search: filters.search || undefined,
          status: filters.status || undefined,
          start_date: filters.startDate ? dayjs(filters.startDate).format('YYYY-MM-DD') : undefined,
          end_date: filters.endDate ? dayjs(filters.endDate).format('YYYY-MM-DD') : undefined
        });
        
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
  }, [page, rowsPerPage, filters]);
  
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
  
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setOrderDetailsDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOrderDetailsDialog(false);
    setSelectedOrder(null);
  };
  
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      
      
      
      
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      );
      
      setOrders(updatedOrders);
      
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Error updating order status.');
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
      case ORDER_STATUS.CANCELED:
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
                onClick={() => handleUpdateOrderStatus(id, ORDER_STATUS.CANCELED)}
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
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Orders
        </Typography>
        
        {canCreateOrders && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {}}
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
              Order Details: {selectedOrder.id}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Customer Information
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedOrder.customer}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Delivery Address
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {selectedOrder.deliveryAddress}
                </Typography>
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
                        {dayjs(selectedOrder.date).format('MM/DD/YYYY HH:mm')}
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
                      {selectedOrder.products && selectedOrder.products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell align="center">{product.quantity}</TableCell>
                          <TableCell align="right">
                            ${product.price !== undefined ? product.price.toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell align="right">
                            ${product.price !== undefined && product.quantity ? 
                              (product.price * product.quantity).toFixed(2) : '0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                          Total
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          ${selectedOrder.totalAmount !== undefined ? 
                            selectedOrder.totalAmount.toFixed(2) : '0.00'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {canManageOrders && (
              <>
                {selectedOrder.status === ORDER_STATUS.PENDING && (
                  <>
                    <Button 
                      onClick={() => {
                        handleUpdateOrderStatus(selectedOrder.id, ORDER_STATUS.APPROVED);
                        handleCloseDialog();
                      }} 
                      color="success"
                    >
                      Approve
                    </Button>
                    <Button 
                      onClick={() => {
                        handleUpdateOrderStatus(selectedOrder.id, ORDER_STATUS.CANCELED);
                        handleCloseDialog();
                      }} 
                      color="error"
                    >
                      Reject
                    </Button>
                  </>
                )}
                {selectedOrder.status === ORDER_STATUS.APPROVED && (
                  <Button 
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, ORDER_STATUS.SHIPPED);
                      handleCloseDialog();
                    }} 
                    color="primary"
                  >
                    Mark as Shipped
                  </Button>
                )}
                {selectedOrder.status === ORDER_STATUS.SHIPPED && (
                  <Button 
                    onClick={() => {
                      handleUpdateOrderStatus(selectedOrder.id, ORDER_STATUS.DELIVERED);
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
    </Box>
  );
};

export default Orders; 