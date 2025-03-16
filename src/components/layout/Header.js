import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Menu, 
  MenuItem, 
  Avatar, 
  Badge, 
  InputBase,
  Tooltip,
  ListItemIcon,
  ListItemText,
  Divider,
  ListItem,
  List,
  Paper,
  Chip,
  Button
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Search as SearchIcon, 
  Notifications as NotificationsIcon, 
  AccountCircle,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  MoreHoriz as MoreHorizIcon
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';

import { logout, selectUser } from '../../redux/features/authSlice';


const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const Header = ({ sidebarOpen, toggleSidebar, drawerWidth = 250 }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);

  const isMenuOpen = Boolean(anchorEl);
  const isNotificationsMenuOpen = Boolean(notificationsAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleMenuClose();
  };

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
        My Profile
      </MenuItem>
      <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
        Settings
      </MenuItem>
      <MenuItem onClick={handleLogout}>Logout</MenuItem>
    </Menu>
  );

  const renderNotificationsMenu = (
    <Menu
      anchorEl={notificationsAnchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isNotificationsMenuOpen}
      onClose={handleNotificationsMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 350, maxHeight: 450, borderRadius: 2, p: 1 }
      }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="h6" fontWeight="bold">Notifications</Typography>
        <Typography variant="body2" color="text.secondary">
          3 new notifications in the last 24 hours
        </Typography>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <List sx={{ p: 0 }}>
        <ListItem alignItems="flex-start" sx={{ 
          borderRadius: 1, 
          mb: 1, 
          '&:hover': { bgcolor: 'action.hover' } 
        }}>
          <ListItemIcon sx={{ mt: 1 }}>
            <Avatar sx={{ bgcolor: 'error.light', width: 36, height: 36 }}>
              <WarningIcon fontSize="small" />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight="medium">Stock Alert</Typography>
                <Chip size="small" color="error" label="Important" />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  Laptop X3 product is below critical stock level (5 items)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  20 minutes ago
                </Typography>
              </Box>
            }
          />
        </ListItem>
        
        <ListItem alignItems="flex-start" sx={{ 
          borderRadius: 1, 
          mb: 1, 
          '&:hover': { bgcolor: 'action.hover' } 
        }}>
          <ListItemIcon sx={{ mt: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
              <ShoppingCartIcon fontSize="small" />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight="medium">New Order</Typography>
                <Chip size="small" color="primary" label="Order" />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  Order #12345 created - Mega Market
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  2 hours ago
                </Typography>
              </Box>
            }
          />
        </ListItem>
        
        <ListItem alignItems="flex-start" sx={{ 
          borderRadius: 1, 
          '&:hover': { bgcolor: 'action.hover' } 
        }}>
          <ListItemIcon sx={{ mt: 1 }}>
            <Avatar sx={{ bgcolor: 'warning.light', width: 36, height: 36 }}>
              <InventoryIcon fontSize="small" />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight="medium">Price Update</Typography>
                <Chip size="small" color="warning" label="Action Required" />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                  Cost changes detected for 5 products
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  5 hours ago
                </Typography>
              </Box>
            }
          />
        </ListItem>
      </List>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Button 
          variant="text" 
          endIcon={<MoreHorizIcon />}
          onClick={() => {
            handleNotificationsMenuClose();
            navigate('/notifications');
          }}
        >
          View All Notifications
        </Button>
      </Box>
    </Menu>
  );

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: { sm: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
        ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
        transition: theme => theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        })
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={toggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          AI Stock Management
        </Typography>
        
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search…"
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex' }}>
          <IconButton
            size="large"
            aria-label="show 4 new notifications"
            aria-controls="notifications-menu"
            aria-haspopup="true"
            onClick={handleNotificationsMenuOpen}
            color="inherit"
          >
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            {user?.avatar ? (
              <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 32, height: 32 }} />
            ) : (
              <AccountCircle />
            )}
          </IconButton>
        </Box>
      </Toolbar>
      {renderMenu}
      {renderNotificationsMenu}
    </AppBar>
  );
};

export default Header; 