import React from 'react';
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
  Avatar
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  WarningAmber,
  Inventory,
  ShoppingCart,
  LocalShipping,
  AttachMoney
} from '@mui/icons-material';


const SimpleChart = () => {
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
      
      {[70, 45, 85, 65, 90, 80, 75].map((height, index) => (
        <Box
          key={index}
          sx={{
            width: '10%',
            height: `${height}%`,
            backgroundColor: theme => theme.palette.primary.main,
            opacity: 0.7 + (index * 0.05),
            borderRadius: 1,
          }}
        />
      ))}
    </Box>
  );
};

const Dashboard = () => {
  
  const stats = {
    totalProducts: 234,
    lowStockItems: 12,
    ordersToday: 8,
    revenue: 12580,
    pendingDeliveries: 5
  };
  
  const recentActivities = [
    { id: 1, action: 'New product added', product: 'Samsung Galaxy S21', time: '2 minutes ago', type: 'add' },
    { id: 2, action: 'Stock updated', product: 'Apple iPhone 14', time: '15 minutes ago', type: 'update' },
    { id: 3, action: 'New order', product: 'Order #12345', time: '34 minutes ago', type: 'order' },
    { id: 4, action: 'Stock low!', product: 'Sony PlayStation 5', time: '1 hour ago', type: 'warning' },
    { id: 5, action: 'Delivery completed', product: 'Order #12341', time: '2 hours ago', type: 'delivery' },
  ];
  
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
  
  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Total Products
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 'medium' }}>
              {stats.totalProducts}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp fontSize="small" color="success" />
              <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                5% increase
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Critical Stock (Low)
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 'medium' }}>
              {stats.lowStockItems}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingDown fontSize="small" color="error" />
              <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>
                Urgent attention needed
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Today's Orders
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 'medium' }}>
              {stats.ordersToday}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp fontSize="small" color="success" />
              <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                2 new orders
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Revenue (This Month)
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 'medium' }}>
              ${stats.revenue.toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp fontSize="small" color="success" />
              <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                12% increase
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      
      <Grid container spacing={3}>
        
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardHeader 
              title="Sales Statistics" 
              subheader="Sales data for the last 7 days"
            />
            <Divider />
            <CardContent>
              <SimpleChart />
            </CardContent>
          </Card>
        </Grid>
        
        
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardHeader 
              title="Recent Activities" 
              subheader="Latest changes in the system"
            />
            <Divider />
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {recentActivities.map((activity) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      {getActivityIcon(activity.type)}
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.action}
                      secondary={
                        <React.Fragment>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {activity.product}
                          </Typography>
                          {activity.time}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {activity.id !== recentActivities.length && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </Grid>
        
        
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardHeader 
              title="Stock Predictions (AI)" 
              subheader="AI-powered stock forecasting"
            />
            <Divider />
            <CardContent>
              <Typography variant="body1" paragraph>
                This section will display AI-powered stock predictions. Product sales history, seasonal data, and market trends are analyzed to predict future stock needs.
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1 }}>
                <Typography variant="body2">
                  The AI module is still under development. Soon you will be able to see sales forecasts and stock recommendations here.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardHeader 
              title="Pending Deliveries" 
              subheader={`${stats.pendingDeliveries} deliveries pending`}
            />
            <Divider />
            <CardContent>
              <List>
                {[...Array(3)].map((_, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <LocalShipping />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Order #${12345 + index}`}
                        secondary={`Estimated Delivery: in ${index + 1} days`}
                      />
                    </ListItem>
                    {index < 2 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 