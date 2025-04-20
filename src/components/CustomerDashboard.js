import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  Paid as PaidIcon,
  History as HistoryIcon
} from '@mui/icons-material';

const CustomerDashboard = ({ stats, loading, error, navigate }) => {
  const getStatusChip = (status) => {
    let color = 'default';
    
    switch (status?.toLowerCase()) {
      case 'pending':
        color = 'warning';
        break;
      case 'processing':
        color = 'primary';
        break;
      case 'completed':
        color = 'success';
        break;
      case 'cancelled':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={status || 'unknown'} 
        color={color} 
        size="small" 
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Dashboard
      </Typography>
      
      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <ShoppingCartIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {stats?.totalOrders || 0}
              </Typography>
              <Typography color="text.secondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <LocalShippingIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {stats?.pendingOrders || 0}
              </Typography>
              <Typography color="text.secondary">
                Pending Deliveries
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <PaidIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" component="div">
                {formatCurrency(stats?.totalSpent)}
              </Typography>
              <Typography color="text.secondary">
                Total Spent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div" gutterBottom>
                  Quick Actions
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/orders/new')}
                  sx={{ mb: 1 }}
                >
                  New Order
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/products')}
                >
                  Browse Products
                </Button>
              </CardContent>
            </Box>
          </Card>
        </Grid>
      </Grid>
      
      {/* Recent Orders */}
      <Paper sx={{ mb: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Recent Orders
          </Typography>
          <Button 
            variant="text" 
            onClick={() => navigate('/orders')}
          >
            View All
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {stats?.recentOrders?.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.order_number || `#${order.id}`}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{getStatusChip(order.status)}</TableCell>
                    <TableCell align="right">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
            No recent orders found.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerDashboard; 