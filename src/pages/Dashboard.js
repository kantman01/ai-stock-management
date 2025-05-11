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
  Pending as PendingIcon,
  Timeline,
  Insights,
  AutoGraph,
  SmartToy,
  Smartphone
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
  
  console.log("StaffDashboard rendering with aiActions:", aiActions);
  console.log("AI Actions count:", aiActions?.length);
  if (aiActions && aiActions.length > 0) {
    console.log("First AI action sample:", aiActions[0]);
  }

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
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ 
            p: 2, 
            background: theme => `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            color: 'white',
            boxShadow: 3
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToy sx={{ mr: 1.5, fontSize: 28 }} />
                <Typography variant="h5" fontWeight="bold">AI Insights & Recommendations</Typography>
              </Box>
              <Button 
                variant="contained" 
                size="small"
                color="secondary"
                onClick={() => navigate('/ai-analytics')}
                sx={{ fontWeight: 'bold' }}
              >
                View All AI Analytics
              </Button>
            </Box>
            <Typography variant="subtitle1" sx={{ mb: 2, opacity: 0.9 }}>
              AI-powered stock management insights to optimize your inventory and business decisions
            </Typography>
            <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={40} color="secondary" />
              </Box>
            ) : aiActions.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                <Typography color="white">No AI actions available at this time</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {aiActions.map((action, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card sx={{ 
                      height: '100%', 
                      boxShadow: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardHeader
                        avatar={
                          <Avatar sx={{ bgcolor: 
                            action.action_type === 'stock_prediction' ? 'info.main' :
                            action.action_type === 'restock_recommendation' ? 'warning.main' :
                            action.action_type === 'create_supplier_order' ? 'success.main' :
                            action.action_type === 'sales_forecast' ? 'primary.main' :
                            action.action_type === 'business_recommendation' ? 'secondary.main' :
                            'primary.main'
                          }}>
                            {getAIActionIcon(action.action_type)}
                          </Avatar>
                        }
                        title={getAIActionTitle(action)}
                        subheader={formatTimeAgo(action.created_at)}
                        action={
                          <Chip 
                            label={action.status || 'AI Processed'} 
                            color={
                              action.status === 'pending' ? 'warning' :
                              action.status === 'completed' ? 'success' :
                              'primary'
                            }
                            size="small"
                            sx={{ mr: 1, mt: 1 }}
                          />
                        }
                      />
                      <Divider />
                      <CardContent>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {getAIActionDescription(action)}
                          </Typography>
                          
                          {action.action_data && action.action_data.details && (
                            <Box sx={{ mt: 1.5, bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {action.action_data.details}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* Display product-specific information */}
                          {action.action_data && action.action_data.product_info && (
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.100' }}>
                              {action.action_type === 'stock_prediction' && (
                                <>
                                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                                    Product Analysis: {action.action_data.product_info.product_name}
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Current Stock:</Typography>
                                      <Typography variant="body2">{action.action_data.product_info.current_stock}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Predicted Stock:</Typography>
                                      <Typography variant="body2">{action.action_data.product_info.predicted_stock}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Days to Stockout:</Typography>
                                      <Typography variant="body2" color={
                                        parseInt(action.action_data.product_info.days_to_stockout) <= 7 ? 'error.main' : 
                                        parseInt(action.action_data.product_info.days_to_stockout) <= 14 ? 'warning.main' : 
                                        'success.main'
                                      }>
                                        {action.action_data.product_info.days_to_stockout}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </>
                              )}
                              
                              {action.action_type === 'restock_recommendation' && (
                                <>
                                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                                    Restock Recommendation: {action.action_data.product_info.product_name}
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Current Stock:</Typography>
                                      <Typography variant="body2">{action.action_data.product_info.current_stock}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Recommended Order:</Typography>
                                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                                        {action.action_data.product_info.recommended_order} units
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Urgency:</Typography>
                                      <Chip 
                                        size="small" 
                                        label={action.action_data.product_info.urgency} 
                                        color={
                                          action.action_data.product_info.urgency === 'High' ? 'error' :
                                          action.action_data.product_info.urgency === 'Medium' ? 'warning' :
                                          'success'
                                        }
                                        sx={{ ml: 1 }}
                                      />
                                    </Grid>
                                  </Grid>
                                </>
                              )}
                              
                              {action.action_type === 'create_supplier_order' && (
                                <>
                                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                                    Order from: {action.action_data.product_info.supplier_name}
                                  </Typography>
                                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Products:</Typography>
                                      <Typography variant="body2">{action.action_data.product_info.product_count} items</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Total Items:</Typography>
                                      <Typography variant="body2">{action.action_data.product_info.total_items} units</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Including:</Typography>
                                      <Typography variant="body2">
                                        {action.action_data.product_info.top_products.join(', ')}
                                        {action.action_data.product_info.product_count > 2 ? ` and ${action.action_data.product_info.product_count - 2} more` : ''}
                                      </Typography>
                                    </Grid>
                                    {action.action_data.product_info.order_amount !== 'N/A' && (
                                      <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">Order Amount:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                          ${parseFloat(action.action_data.product_info.order_amount).toFixed(2)}
                                        </Typography>
                                      </Grid>
                                    )}
                                  </Grid>
                                </>
                              )}
                            </Box>
                          )}
                          
                          {action.action_type === 'stock_prediction' && action.action_data && (
                            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
                              <AutoGraph color="info" sx={{ mr: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {action.action_data.trend === 'up' ? 
                                  'Increasing demand predicted' : 
                                  action.action_data.trend === 'down' ? 
                                  'Decreasing demand predicted' : 
                                  'Stable demand predicted'}
                              </Typography>
                            </Box>
                          )}
                          
                          {action.action_type === 'sales_forecast' && action.action_data && (
                            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Growth Rate:</strong> {action.action_data.predicted_growth || 'N/A'}
                              </Typography>
                              {action.action_data.seasonal_factor && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Seasonal Impact:</strong> {action.action_data.seasonal_factor}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                        
                        {action.action_data && action.action_data.impact && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mt: 1.5,
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'rgba(0, 0, 0, 0.03)'
                          }}>
                            <Insights color="secondary" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              <strong>Business Impact:</strong> {action.action_data.impact}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                      <Divider />
                      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => navigate('/ai-analytics')}
                          startIcon={<Timeline />}
                        >
                          Details
                        </Button>
                      </Box>
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
  const [supplierStock, setSupplierStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);
  const { user } = useSelector(state => state.auth);


  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: 'error' };
    if (quantity <= 5) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Supplier Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Your Products</Typography>
            <Typography variant="h4">{stats.products || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <ProductsIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">Catalog Items</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Pending Orders</Typography>
            <Typography variant="h4">{stats.pendingOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <PendingIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2">Needs Processing</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Completed Orders</Typography>
            <Typography variant="h4">{stats.completedOrders || 0}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <LocalShipping fontSize="small" color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">Delivered</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Monthly Revenue</Typography>
            <Typography variant="h4">${stats.revenue?.toFixed(2) || '0.00'}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <AttachMoney fontSize="small" color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">This Month</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Supplier Stock Information */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper>
            
            
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button 
                variant="outlined" 
                fullWidth
                color="primary" 
                onClick={() => navigate('/stock/products')}
              >
                Manage Inventory
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Additional supplier dashboard content */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {stats.recentOrders?.length > 0 ? (
                  <List>
                    {stats.recentOrders.map((order) => (
                      <ListItem 
                        key={order.id}
                        sx={{ 
                          borderBottom: '1px solid',
                          borderBottomColor: 'divider',
                          '&:last-child': { borderBottom: 'none' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <ShoppingCart />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`Order #${order.id}`}
                          secondary={`${order.items_count} item(s) - $${parseFloat(order.total_amount).toFixed(2)}`}
                        />
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => navigate(`/supplier-orders/${order.id}`)}
                        >
                          View
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      No recent orders found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <List>
              <ListItem button onClick={() => navigate('/stock/products')}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'info.light' }}>
                    <ProductsIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Manage Products" secondary="Add or edit your product catalog" />
              </ListItem>
              <ListItem button onClick={() => navigate('/stock/supplier-inventory')}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.light' }}>
                    <Inventory />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Update Inventory" secondary="Manage your stock levels" />
              </ListItem>
              <ListItem button onClick={() => navigate('/supplier-orders')}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.light' }}>
                    <ShoppingCart />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary="Process Orders" secondary="View and fulfill pending orders" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
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
      
      const response = await apiServices.aiAnalytics.getRecentActions(6);
      
      
      if (response.data && response.data.actions && response.data.actions.length > 0) {
        console.log("AI Actions from API:", response.data.actions);
        
        const uniqueActions = [];
        const seenActionTypes = new Set();
        
        response.data.actions.forEach(action => {
          if (action.action_type === 'create_supplier_order' && 
              seenActionTypes.has('create_supplier_order')) {
            return;
          }
          
          seenActionTypes.add(action.action_type);
          
          uniqueActions.push({
            ...action,
            action_data: {
              ...action.action_data,
              details: action.action_data?.details || getAdditionalDetails(action),
              impact: action.action_data?.impact || getBusinessImpact(action),
              product_info: getProductInfo(action)
            }
          });
        });
        
        setAIActions(uniqueActions.slice(0, 6));
        return uniqueActions;
      } else {
        
        console.log("No AI actions found - creating sample data");
        const mockActions = createMockAIActions();
        setAIActions(mockActions);
        return mockActions;
      }
    } catch (err) {
      console.error('Error fetching AI actions:', err);
      
      
      console.log("Error fetching AI actions - creating sample data");
      const mockActions = createMockAIActions();
      setAIActions(mockActions);
      return mockActions;
    }
  };
  
  
  const createMockAIActions = () => {
    const now = new Date();
    
    return [
      {
        id: 1,
        action_type: 'stock_prediction',
        created_at: new Date(now - 30 * 60000).toISOString(), 
        status: 'completed',
        action_data: {
          product_id: 101,
          product_name: 'Premium Coffee Beans',
          current_stock: 45,
          predicted_stock: 23,
          days_to_stockout: 12,
          trend: 'down',
          prediction_period: 30,
          seasonal_factor: 1.2,
          cost_savings: '18%',
          summary: 'Stock level analysis for Premium Coffee Beans',
          details: 'Based on 30 day historical data and seasonal pattern analysis',
          impact: 'Prevents overstock and stockouts, optimizing inventory costs by approximately 18%'
        }
      },
      {
        id: 2,
        action_type: 'restock_recommendation',
        created_at: new Date(now - 45 * 60000).toISOString(), 
        status: 'pending',
        action_data: {
          product_id: 102,
          product_name: 'Organic Tea Selection',
          current_stock: 8,
          quantity: 50,
          days_to_stockout: 4,
          urgency: 'High',
          summary: 'Recommend restocking Organic Tea Selection',
          details: 'The AI model detected potential stockout within 4 days',
          impact: 'Ensures product availability and customer satisfaction by maintaining optimal stock levels'
        }
      },
      {
        id: 3,
        action_type: 'create_supplier_order',
        created_at: new Date(now - 60 * 60000).toISOString(), 
        status: 'completed',
        action_data: {
          supplier_id: 5,
          supplier_name: 'Global Foods Inc.',
          items: [
            { product_id: 103, product_name: 'Chocolate Bars', quantity: 120, unit_price: 1.75 },
            { product_id: 104, product_name: 'Premium Cookies', quantity: 80, unit_price: 2.50 },
            { product_id: 105, product_name: 'Organic Honey', quantity: 40, unit_price: 4.25 }
          ],
          total_amount: 470,
          summary: 'AI created supplier order for Global Foods Inc.',
          details: 'Order created automatically to maintain optimal inventory levels for 3 products',
          impact: 'Minimizes manual order processing and prevents stockouts of fast-moving items'
        }
      },
      {
        id: 4,
        action_type: 'sales_forecast',
        created_at: new Date(now - 120 * 60000).toISOString(), 
        status: 'completed',
        action_data: {
          predicted_growth: '12.5%',
          seasonal_factor: 'High (1.4)',
          forecast_period: 60,
          summary: 'Sales forecast for Q2',
          details: 'Forecast period: Next 60 days with seasonal adjustment factor: 1.4',
          impact: 'Enables better planning for inventory, staffing, and budgeting needs across product categories'
        }
      }
    ];
  };
  
  
  const getProductInfo = (action) => {
    if (!action.action_data) return null;
    
    try {
      if (action.action_type === 'stock_prediction' && action.action_data.product_id) {
        return {
          product_id: action.action_data.product_id,
          product_name: action.action_data.product_name || 'Unknown Product',
          current_stock: action.action_data.current_stock || 'N/A',
          predicted_stock: action.action_data.predicted_stock || 'N/A',
          days_to_stockout: action.action_data.days_to_stockout || 'N/A'
        };
      }
      
      if (action.action_type === 'restock_recommendation' && action.action_data.product_id) {
        return {
          product_id: action.action_data.product_id,
          product_name: action.action_data.product_name || 'Unknown Product',
          current_stock: action.action_data.current_stock || 'N/A',
          recommended_order: action.action_data.quantity || 'N/A',
          urgency: action.action_data.urgency || 'Normal'
        };
      }
      
      if (action.action_type === 'create_supplier_order' && action.action_data.items) {
        const productCount = action.action_data.items.length || 0;
        const topProducts = action.action_data.items.slice(0, 2).map(item => item.product_name || 'Unknown Product');
        
        return {
          supplier_name: action.action_data.supplier_name || 'Unknown Supplier',
          product_count: productCount,
          top_products: topProducts,
          total_items: action.action_data.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
          order_amount: action.action_data.total_amount || 'N/A'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting product info:', error);
      return null;
    }
  };
  
  
  const getAdditionalDetails = (action) => {
    if (!action.action_data) return null;
    
    switch (action.action_type) {
      case 'stock_prediction':
        return `Based on ${action.action_data.prediction_period || '30'} day historical data and seasonal analysis`;
      case 'restock_recommendation':
        return `The AI model detected potential stockout within ${action.action_data.days_to_stockout || 'N/A'} days`;
      case 'create_supplier_order':
        return `Order created automatically to maintain optimal inventory levels for ${action.action_data.items?.length || '0'} products`;
      case 'sales_forecast':
        return `Forecast period: Next ${action.action_data.forecast_period || '30'} days with seasonal adjustment factor: ${action.action_data.seasonal_factor || '1.0'}`;
      case 'business_recommendation':
        return `Recommendations prioritized by potential business impact and ROI`;
      default:
        return null;
    }
  };
  
  
  const getBusinessImpact = (action) => {
    if (!action.action_data) return null;
    
    switch (action.action_type) {
      case 'stock_prediction':
        return `Prevents overstock and stockouts, optimizing inventory costs by approximately ${action.action_data.cost_savings || '15-20%'}`;
      case 'restock_recommendation':
        return `Ensures product availability and customer satisfaction by maintaining optimal stock levels`;
      case 'create_supplier_order':
        return `Minimizes manual order processing and prevents stockouts of fast-moving items`;
      case 'sales_forecast':
        return `Enables better planning for inventory, staffing, and budgeting needs across product categories`;
      case 'business_recommendation':
        return `Potential to increase efficiency and profitability by ${action.action_data.improvement_percentage || '10-15%'}`;
      default:
        return null;
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
      case 'create_supplier_order':
        return 'AI Created Supplier Order';
      case 'stock_prediction':
        return 'AI Stock Analysis';
      case 'restock_recommendation':
        return 'AI Restock Recommendation';
      case 'sales_forecast':
        return 'AI Sales Forecast';
      case 'business_recommendation':
        return 'AI Business Recommendations';
      case 'apply_ai_recommendation':
        return 'AI Recommendation Applied';
      default:
        return 'AI Action';
    }
  };
  
  const getAIActionDescription = (action) => {
    try {
      if (!action.action_data) return 'No details available';
      console.log("action.action_type", action.action_type);
      switch (action.action_type) {
        case 'stock_prediction':
          return `AI analyzed stock levels for ${action.action_data.product_name || 'inventory items'} including seasonal patterns and historical trends`;
        case 'apply_ai_recommendation':
          return `AI applied a recommendation to ${action.action_data.product_name || 'inventory items'}`;
        case 'restock_recommendation':
          return `AI recommends ordering ${action.action_data.quantity || ''} units of ${action.action_data.product_name || 'products'} based on consumption rate analysis`;
        case 'create_supplier_order':
          const itemCount = action.action_data.items?.length || 0;
          const supplier = action.action_data.supplier_name || 'supplier';
          return `AI automatically created an order for ${itemCount} products from ${supplier} to prevent potential stockouts`;
        case 'sales_forecast':
          return `AI forecasted ${action.action_data.predicted_growth || ''} sales growth with seasonal adjustment factor: ${action.action_data.seasonal_factor || 'normal'}`;
        case 'business_recommendation':
          return `AI generated ${action.action_data.recommendation_count || ''} optimization recommendations based on ${action.action_data.category_insights || ''} category analysis and year-over-year patterns`;
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
          
          
          return 'AI analysis completed successfully';
      }
    } catch (error) {
      console.error('Error formatting AI action description:', error);
      return 'AI analysis details';
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