import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Link
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  WarningAmber,
  Inventory,
  ShoppingCart,
  LocalShipping,
  AttachMoney,
  Science as ScienceIcon,
  Store as StoreIcon,
  ProductionQuantityLimits as ProductsIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { apiServices } from '../services/api';

const SimpleChart = ({ salesData }) => {
  if (!salesData || salesData.length === 0) {
    return (
      <Box sx={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No sales data available for the selected period
        </Typography>
      </Box>
    );
  }

  
  const labels = salesData.map(item => item.date);
  const values = salesData.map(item => item.total);
  
  
  const maxValue = Math.max(...values);
  const heights = values.map(value => Math.max(10, (value / maxValue) * 100));

  return (
    <Box
      sx={{
        height: 200,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        p: 2,
      }}
    >
      {heights.map((height, index) => (
        <Box
          key={index}
          sx={{
            width: `${100 / heights.length - 2}%`,
            height: `${height}%`,
            backgroundColor: theme => theme.palette.primary.main,
            opacity: 0.7 + (index * 0.05),
            borderRadius: 1,
            position: 'relative',
            '&:hover': {
              opacity: 1,
              '& .tooltip': {
                display: 'block'
              }
            }
          }}
        >
          <Box 
            className="tooltip"
            sx={{ 
              display: 'none',
              position: 'absolute',
              top: -25,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
              px: 1,
              py: 0.5,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap'
            }}
          >
            {labels[index]}: ${values[index]}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const StaffDashboard = ({ 
  stats, 
  salesStats, 
  recentActivities, 
  aiActions, 
  loading, 
  error, 
  salesStatsLoading, 
  navigate,
  getActivityIcon,
  getAIActionIcon,
  getAIActionTitle,
  getAIActionDescription,
  formatTimeAgo
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Total Products</Typography>
            <Typography variant="h4">{stats.totalProducts}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <Inventory fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">Inventory Items</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Low Stock Items</Typography>
            <Typography variant="h4">{stats.lowStockItems}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <WarningAmber fontSize="small" color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2">Needs Attention</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Today's Orders</Typography>
            <Typography variant="h4">{stats.ordersToday}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <ShoppingCart fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">New Orders</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Monthly Revenue</Typography>
            <Typography variant="h4">${stats.revenue.toFixed(2)}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <AttachMoney fontSize="small" color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">This Month</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts and Activity Feed */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Sales Overview</Typography>
            {salesStatsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={40} />
              </Box>
            ) : salesStats.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">No sales data available</Typography>
              </Box>
            ) : (
              <SimpleChart salesData={salesStats} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Recent Activities</Typography>
            <List>
              {recentActivities.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No recent activities" />
                </ListItem>
              ) : (
                recentActivities.map((activity, index) => (
                  <ListItem key={index} divider={index < recentActivities.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.action}
                      secondary={formatTimeAgo(activity.time)}
                    />
                    <Link to={activity.link}>
                      <Button variant="text" size="small">
                        View Details
                      </Button>
                    </Link>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">AI Insights</Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/ai-analytics')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={40} />
              </Box>
            ) : aiActions.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="textSecondary">No AI actions available</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {aiActions.map((action, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                            {getAIActionIcon(action.action_type)}
                          </Avatar>
                          <Typography variant="subtitle1">{getAIActionTitle(action)}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {getAIActionDescription(action)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(action.created_at)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const SupplierDashboard = ({ stats = {}, loading, error, navigate }) => {
  const hasRecentOrders = stats?.recentOrders && stats.recentOrders.length > 0;
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Supplier Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Supplier Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">My Products</Typography>
            <Typography variant="h4">{stats?.totalProducts || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <ProductsIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">Products you supply</Typography>
            </Box>
            <Button 
              variant="text" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/stock/products')}
            >
              View My Products
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Pending Orders</Typography>
            <Typography variant="h4">{stats?.pendingOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <PendingIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2">Awaiting your action</Typography>
            </Box>
            <Button 
              variant="text" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/supplier-orders')}
            >
              View Orders
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Monthly Orders</Typography>
            <Typography variant="h4">{stats?.monthlyOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <StoreIcon fontSize="small" color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">This Month</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              fullWidth
              startIcon={<ProductsIcon />}
              onClick={() => navigate('/stock/products')}
            >
              Manage Products
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="contained" 
              color="primary"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={() => navigate('/supplier-orders')}
            >
              Process Orders
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Orders */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Orders</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box>
            {hasRecentOrders ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats?.recentOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>${parseFloat(order.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={order.status} 
                            color={
                              order.status === 'pending' ? 'warning' : 
                              order.status === 'approved' ? 'info' :
                              order.status === 'shipped' ? 'primary' :
                              order.status === 'delivered' ? 'secondary' :
                              order.status === 'completed' ? 'success' : 'default'
                            } 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => navigate('/supplier-orders')}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No recent orders to display
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="outlined"
                onClick={() => navigate('/supplier-orders')}
              >
                View All Orders
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const CustomerDashboard = ({ stats, loading, error, navigate }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Customer Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Typography variant="body1" sx={{ mb: 3 }}>
        Welcome to your dashboard. Access your orders and browse products.
      </Typography>

    {/* Quick Actions */}
    <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="contained" 
              fullWidth
              startIcon={<ProductsIcon />}
              onClick={() => navigate('/stock/products')}
            >
              Browse Products
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="contained" 
              color="primary"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Customer Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Your Orders</Typography>
            <Typography variant="h4">{stats.totalOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <ShoppingCart fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">Total Orders</Typography>
            </Box>
            <Button 
              variant="text" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/orders')}
            >
              View Orders
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Pending Deliveries</Typography>
            <Typography variant="h4">{stats.pendingDeliveries || stats.shippedOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <LocalShipping fontSize="small" color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2">On the way</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      {stats.recentOrders && stats.recentOrders.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Recent Orders</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.order_number || order.id}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>${parseFloat(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={order.status}
                        color={
                          order.status === 'delivered' ? 'success' :
                          order.status === 'shipped' ? 'primary' :
                          order.status === 'approved' ? 'info' :
                          order.status === 'pending' ? 'warning' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      
    </Box>
  );
};


const ErrorMessage = ({ message }) => (
  <div className="error-container">
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [salesStats, setSalesStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [aiActions, setAIActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesStatsLoading, setSalesStatsLoading] = useState(true);
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role?.code === 'staff' || user.role?.code === 'admin') {
        fetchDashboardData();
        fetchSalesStats();
        fetchRecentActivities();
        fetchAIActions();
      } else if (user.role?.code === 'supplier') {
        fetchSupplierStats();
      } else if (user.role?.code === 'customer') {
        fetchCustomerStats();
      }
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      console.log("fetchDashboardData: ",user);
      setLoading(true);
      setError(null);
      
      if (user?.role?.code === 'staff' || user?.role?.code === 'admin') {
        
        setSalesStatsLoading(true);
        const [statsRes, salesRes, activitiesRes, aiActionsRes] = await Promise.all([
          apiServices.dashboard.getStats(),
          apiServices.dashboard.getSales(),
          apiServices.dashboard.getActivities(),
          fetchAIActions()
        ]);
        
        
        const dashStats = statsRes.data.stats || {};
        
        setStats({
          totalProducts: dashStats.totalProducts || 0,
          lowStockItems: dashStats.lowStockItems || 0,
          ordersToday: dashStats.todayOrders || 0,
          revenue: dashStats.monthlyRevenue || 0,
          pendingDeliveries: 0 
        });
        
        
        setSalesStats(salesRes.data.sales || []);
        
        
        setRecentActivities(activitiesRes.data.activities || []);
      } 
      else if (user?.role?.code === 'customer') {
        
        const customerStats = await fetchCustomerStats();
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
      setSalesStatsLoading(false);
    }
  };
  
  const fetchSupplierStats = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user || !user.supplierId) {
        console.error('No supplier ID available for this user');
        setError('Supplier information not found');
        setStats({
          totalProducts: 0,
          pendingOrders: 0,
          monthlyOrders: 0,
          recentOrders: []
        });
        return;
      }

      
      const response = await apiServices.dashboard.getSupplierStats({
        supplier_id: user.supplierId
      });
      console.log("Supplier dashboard response:", response);
      
      if (response.data && response.data.stats) {
        setStats(response.data.stats);
      } else {
        setStats({
          totalProducts: 0,
          pendingOrders: 0,
          monthlyOrders: 0,
          recentOrders: []
        });
      }
    } catch (error) {
      console.error('Error fetching supplier stats:', error);
      setError('Error loading your dashboard. Please try again later.');
      setStats({
        totalProducts: 0,
        pendingOrders: 0,
        monthlyOrders: 0,
        recentOrders: []
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCustomerStats = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('user', user);
      if (!user || !user.customerId) {
        throw new Error('Customer information not found');
      }

      const response = await apiServices.dashboard.getCustomerStats({
        customer_id: user.customerId
      });
      setStats(response.data.stats);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customer dashboard stats:', err);
      setError('Error loading your dashboard. Please try again later.');
      setLoading(false);
    }
  };
  
  const fetchAIActions = async () => {
    try {
      
      const response = await apiServices.aiAnalytics.getRecentActions(5);
      if (response.data && response.data.actions) {
        setAIActions(response.data.actions);
        return response.data.actions;
      }
      return [];
      
    } catch (err) {
      console.error('Error fetching AI actions:', err);
      return [];
    }
  };
  
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
      return 'Just now';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'add':
        return <Avatar sx={{ bgcolor: 'success.main' }}><Inventory /></Avatar>;
      case 'update':
        return <Avatar sx={{ bgcolor: 'info.main' }}><TrendingUp /></Avatar>;
      case 'order':
        return <Avatar sx={{ bgcolor: 'primary.main' }}><ShoppingCart /></Avatar>;
      case 'warning':
        return <Avatar sx={{ bgcolor: 'warning.main' }}><WarningAmber /></Avatar>;
      case 'delivery':
        return <Avatar sx={{ bgcolor: 'secondary.main' }}><LocalShipping /></Avatar>;
      default:
        return <Avatar><Inventory /></Avatar>;
    }
  };
  
  const getAIActionIcon = (type) => {
    switch (type) {
      case 'stock_prediction':
      case 'restock_recommendation':
        return <Avatar sx={{ bgcolor: 'info.main' }}><Inventory /></Avatar>;
      case 'create_supplier_order':
        return <Avatar sx={{ bgcolor: 'success.main' }}><LocalShipping /></Avatar>;
      case 'sales_forecast':
        return <Avatar sx={{ bgcolor: 'primary.main' }}><TrendingUp /></Avatar>;
      case 'business_recommendation':
        return <Avatar sx={{ bgcolor: 'warning.main' }}><AttachMoney /></Avatar>;
      default:
        return <Avatar sx={{ bgcolor: 'primary.main' }}><ScienceIcon /></Avatar>;
    }
  };
  
  const getAIActionTitle = (action) => {
    switch (action.action_type) {
      case 'stock_prediction':
        return 'AI Stock Analysis';
      case 'restock_recommendation':
        return 'AI Restock Recommendation';
      case 'create_supplier_order':
        return 'AI Created Supplier Order';
      case 'sales_forecast':
        return 'AI Sales Forecast';
      case 'business_recommendation':
        return 'AI Business Recommendations';
      default:
        return 'AI Action';
    }
  };
  
  const getAIActionDescription = (action) => {
    try {
      if (!action.action_data) return 'No details available';
      
      switch (action.action_type) {
        case 'stock_prediction':
          return `Analyzed ${action.action_data.summary?.replace(/"/g, '') || 'inventory stock levels'}`;
        case 'restock_recommendation':
          return `${action.action_data.quantity || ''} units of ${action.action_data.product_name || 'products'}`;
        case 'create_supplier_order':
          return `${action.action_data.items.length || '0'} items from ${action.action_data.supplier_name || 'supplier'}`;
        case 'sales_forecast':
          return `Predicted growth: ${action.action_data.predicted_growth || 'analyzed sales patterns'}`;
        case 'business_recommendation':
          return `${action.action_data.recommendation_count || '0'} recommendations based on ${action.action_data.category_insights || '0'} categories`;
        default:
          
          if (action.action_data.summary) {
            return action.action_data.summary.replace(/"/g, '');
          }
          
          
          const fieldsToCheck = ['summary', 'description', 'message', 'action', 'status'];
          for (const field of fieldsToCheck) {
            if (action.action_data[field]) {
              return String(action.action_data[field]).replace(/"/g, '');
            }
          }
          
          
          return 'AI action completed';
      }
    } catch (error) {
      console.error('Error formatting AI action description:', error);
      return 'AI action details';
    }
  };
  
  const handleViewDetails = (url) => {
    if (url) {
      navigate(url);
    }
  };

  
  const fetchSalesStats = async () => {
    setSalesStatsLoading(true);
    try {
      const response = await apiServices.dashboard.getSales();
      setSalesStats(response.data.sales || []);
    } catch (err) {
      console.error('Error fetching sales stats:', err);
    } finally {
      setSalesStatsLoading(false);
    }
  };

  
  const fetchRecentActivities = async () => {
    try {
      const response = await apiServices.dashboard.getActivities();
      setRecentActivities(response.data.activities || []);
    } catch (err) {
      console.error('Error fetching recent activities:', err);
    }
  };

  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (user?.role?.code === 'supplier') {
    return (
      <SupplierDashboard 
        stats={stats} 
        loading={loading} 
        error={error} 
        navigate={navigate}
      />
    );
  }
  
  if (user?.role?.code === 'customer') {
    return (
      <CustomerDashboard 
        stats={stats} 
        loading={loading} 
        error={error} 
        navigate={navigate}
      />
    );
  }

  return (
    <StaffDashboard 
      stats={stats}
      salesStats={salesStats}
      recentActivities={recentActivities}
      aiActions={aiActions}
      loading={loading}
      error={error}
      salesStatsLoading={salesStatsLoading}
      navigate={navigate}
      getActivityIcon={getActivityIcon}
      getAIActionIcon={getAIActionIcon}
      getAIActionTitle={getAIActionTitle}
      getAIActionDescription={getAIActionDescription}
      formatTimeAgo={formatTimeAgo}
    />
  );
};

export default Dashboard; 