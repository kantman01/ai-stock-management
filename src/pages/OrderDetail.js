import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import api from '../services/api';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';

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

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const isCustomer = user?.role?.code === 'customer';
  const canManageOrders = hasPermission(user?.role, PERMISSIONS.MANAGE_ORDERS);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    try {
      setProcessingAction(true);
      
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      
      
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(`Failed to update order status: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      setProcessingAction(true);
      
      await api.delete(`/orders/${id}`);
      
      
      await fetchOrderDetails();
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError(`Failed to cancel order: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusChip = (status) => {
    let color = 'default';
    let icon = null;
    
    switch (status) {
      case ORDER_STATUS.PENDING:
        color = 'warning';
        icon = <ShoppingCartIcon />;
        break;
      case ORDER_STATUS.APPROVED:
        color = 'info';
        icon = <CheckCircleIcon />;
        break;
      case ORDER_STATUS.SHIPPED:
        color = 'primary';
        icon = <ShippingIcon />;
        break;
      case ORDER_STATUS.DELIVERED:
        color = 'success';
        icon = <CheckCircleIcon />;
        break;
      case ORDER_STATUS.CANCELLED:
        color = 'error';
        icon = <CancelIcon />;
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={ORDER_STATUS_LABELS[status] || status} 
        color={color} 
        size="medium"
        icon={icon}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Order not found.</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/orders')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <ShoppingCartIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Orders
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          Order #{order.order_number || order.id}
        </Typography>
      </Breadcrumbs>

      {/* Order Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="primary" 
            onClick={() => navigate('/orders')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Order #{order.order_number || order.id}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Order Information Card */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(order.status)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">Order Date</Typography>
                  <Typography variant="body1">
                    {dayjs(order.created_at).format('MMM D, YYYY h:mm A')}
                  </Typography>
                </Box>

                {order.updated_at && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body1">
                      {dayjs(order.updated_at).format('MMM D, YYYY h:mm A')}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">Order Total</Typography>
                  <Typography variant="h6" color="primary">
                    ${parseFloat(order.total_amount).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Information Card */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {order.customer_name}
                  </Typography>
                  {order.customer_email && (
                    <Typography variant="body2" color="text.secondary">
                      {order.customer_email}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {order.customer_phone && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{order.customer_phone}</Typography>
                </Box>
              )}
              
              {order.customer_address && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Address</Typography>
                  <Typography variant="body1">{order.customer_address}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Actions Card */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {canManageOrders && (
                <Stack spacing={2}>
                  {order.status === ORDER_STATUS.PENDING && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={() => handleUpdateOrderStatus('APPROVED')}
                        disabled={processingAction}
                      >
                        {processingAction ? <CircularProgress size={24} /> : 'Approve Order'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={handleCancelOrder}
                        disabled={processingAction}
                      >
                        Cancel Order
                      </Button>
                    </>
                  )}
                  
                  {order.status === ORDER_STATUS.APPROVED && (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<ShippingIcon />}
                      onClick={() => handleUpdateOrderStatus('SHIPPED')}
                      disabled={processingAction}
                    >
                      {processingAction ? <CircularProgress size={24} /> : 'Mark as Shipped'}
                    </Button>
                  )}
                  
                  {order.status === ORDER_STATUS.SHIPPED && (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleUpdateOrderStatus('DELIVERED')}
                      disabled={processingAction}
                    >
                      {processingAction ? <CircularProgress size={24} /> : 'Mark as Delivered'}
                    </Button>
                  )}
                </Stack>
              )}
              
              {!canManageOrders && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Your order is {ORDER_STATUS_LABELS[order.status]}.
                  {order.status === ORDER_STATUS.PENDING && ' We will process it shortly.'}
                  {order.status === ORDER_STATUS.APPROVED && ' It is being prepared for shipping.'}
                  {order.status === ORDER_STATUS.SHIPPED && ' It is on the way to you.'}
                  {order.status === ORDER_STATUS.DELIVERED && ' Thank you for your purchase!'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Items */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items && order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {item.product_image ? (
                              <Avatar 
                                src={item.product_image} 
                                alt={item.product_name}
                                variant="rounded" 
                                sx={{ width: 40, height: 40, mr: 2 }}
                              />
                            ) : (
                              <Avatar 
                                variant="rounded" 
                                sx={{ width: 40, height: 40, mr: 2, bgcolor: 'grey.200' }}
                              >
                                <ShoppingCartIcon color="disabled" />
                              </Avatar>
                            )}
                            <Box>
                              <Typography variant="body1">{item.product_name}</Typography>
                              {item.sku && (
                                <Typography variant="body2" color="text.secondary">
                                  SKU: {item.sku}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${parseFloat(item.unit_price).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(item.total_price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Order Summary */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Card variant="outlined" sx={{ width: { xs: '100%', sm: '50%', md: '30%' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Order Summary</Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Subtotal:</Typography>
                      <Typography variant="body1">
                        ${parseFloat(order.subtotal || order.total_amount).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {order.tax_amount !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1">Tax:</Typography>
                        <Typography variant="body1">
                          ${parseFloat(order.tax_amount).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    
                    {order.shipping_cost !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1">Shipping:</Typography>
                        <Typography variant="body1">
                          ${parseFloat(order.shipping_cost).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderDetail; 