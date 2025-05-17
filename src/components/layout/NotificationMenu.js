import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Button,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Science as ScienceIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import { apiServices } from '../../services/api'; // API isteklerini yöneten servisleri içe aktar (bildirimleri çekme, okundu işaretleme, silme işlemleri vb.)
import { format } from 'date-fns';

const NotificationMenu = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    
    fetchNotifications(); // Sayfa ilk yüklendiğinde 1 kere çağrılır

     
    const intervalId = setInterval(fetchNotifications, 60000); // 60.000 ms = 60 saniye

    return () => clearInterval(intervalId);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiServices.notifications.getAll();
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    
    try {
      await apiServices.notifications.markAsRead(notification.id);
      
      
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
      
      
      if (notification.action_link) {
        navigate(notification.action_link);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
    
    handleClose();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiServices.notifications.markAllAsRead();
      
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation();
    try {
      await apiServices.notifications.delete(notificationId);
      
      
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ai_prediction':
      case 'ai_forecast':
      case 'ai_recommendation':
      case 'ai_order_analysis':
      case 'ai_inventory_analysis':
        return <ScienceIcon color="primary" />;
      case 'ai_auto_order':
        return <ShoppingCartIcon color="secondary" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <CheckIcon color="success" />;
      case 'inventory':
        return <InventoryIcon color="primary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };
  
  const getFormattedDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, HH:mm');
    } catch (err) {
      return dateString;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-controls={open ? 'notification-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            width: 350,
            maxHeight: 450,
            '& .MuiMenu-list': {
              padding: 0,
              maxHeight: 'calc(100% - 48px)',
              overflow: 'auto'
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
          borderBottom: '1px solid divider'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', pl: 1 }}>
            Notifications
          </Typography>
          <Button 
            size="small" 
            startIcon={<MarkReadIcon />} 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
        </Box>
        
        <Box sx={{ maxHeight: 'calc(450px - 48px)', overflow: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && notifications.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          )}

          {!loading && !error && notifications.map((notification) => (
            <MenuItem 
              key={notification.id} 
              onClick={() => handleNotificationClick(notification)}
              sx={{ 
                py: 1.5,
                bgcolor: !notification.read ? 'action.hover' : 'transparent',
                position: 'relative'
              }}
            >
              <ListItemIcon>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText 
                primary={notification.title}
                secondary={
                  <Box>
                    <Typography variant="body2" noWrap sx={{ width: '200px' }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getFormattedDate(notification.created_at)}
                    </Typography>
                  </Box>
                }
              />
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', right: 2, top: 2 }}
                onClick={(e) => handleDeleteNotification(e, notification.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationMenu; 