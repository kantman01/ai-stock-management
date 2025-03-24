import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  List,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  Avatar,
  Typography,
  Button,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  People as CustomersIcon,
  Assessment as ReportIcon,
  Insights as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Category as CategoryIcon,
  LocalShipping as SuppliersIcon,
  Autorenew as StockMovementIcon,
  BubbleChart as AIIcon,
  PersonAdd as UserManagementIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { PERMISSIONS, canAccessMenuItem } from '../../utils/roles';
import { selectUser, logout } from '../../redux/features/authSlice';

const StyledDrawer = styled(Drawer)(({ theme, drawerWidth }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
  },
}));

const Sidebar = ({ open, onClose, drawerWidth = 250 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [stockOpen, setStockOpen] = React.useState(false);
  const [reportsOpen, setReportsOpen] = React.useState(false);
  const [userManagementOpen, setUserManagementOpen] = React.useState(false);

  const handleStockClick = () => {
    setStockOpen(!stockOpen);
  };

  const handleReportsClick = () => {
    setReportsOpen(!reportsOpen);
  };

  const handleUserManagementClick = () => {
    setUserManagementOpen(!userManagementOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isSelected = (path) => location.pathname === path;

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      permission: PERMISSIONS.VIEW_DASHBOARD,
    },
    {
      text: 'Stock Management',
      icon: <InventoryIcon />,
      submenu: true,
      onClick: handleStockClick,
      open: stockOpen,
      permission: [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.VIEW_CATEGORIES, PERMISSIONS.VIEW_STOCK_MOVEMENTS],
      items: [
        {
          text: 'Products',
          icon: <InventoryIcon />,
          path: '/stock/products',
          permission: PERMISSIONS.VIEW_PRODUCTS,
        },
        {
          text: 'Categories',
          icon: <CategoryIcon />,
          path: '/stock/categories',
          permission: PERMISSIONS.VIEW_CATEGORIES,
        },
        {
          text: 'Stock Movements',
          icon: <StockMovementIcon />,
          path: '/stock/movements',
          permission: PERMISSIONS.VIEW_STOCK_MOVEMENTS,
        },
      ],
    },
    {
      text: 'Orders',
      icon: <OrdersIcon />,
      path: '/orders',
      permission: [PERMISSIONS.VIEW_ORDERS, PERMISSIONS.MANAGE_ORDERS, PERMISSIONS.CREATE_ORDERS],
    },
    {
      text: 'Supplier Orders',
      icon: <SuppliersIcon />,
      path: '/supplier-orders',
      permission: PERMISSIONS.MANAGE_INVENTORY,
    },
    {
      text: 'Customers',
      icon: <CustomersIcon />,
      path: '/customers',
      permission: [PERMISSIONS.VIEW_CUSTOMERS, PERMISSIONS.MANAGE_CUSTOMERS],
    },
    {
      text: 'Suppliers',
      icon: <SuppliersIcon />,
      path: '/suppliers',
      permission: [PERMISSIONS.VIEW_SUPPLIERS, PERMISSIONS.MANAGE_SUPPLIERS],
    },
    {
      text: 'Reports',
      icon: <ReportIcon />,
      submenu: true,
      onClick: handleReportsClick,
      open: reportsOpen,
      permission: [PERMISSIONS.VIEW_SALES_REPORT, PERMISSIONS.VIEW_STOCK_REPORT, PERMISSIONS.VIEW_CUSTOMER_REPORT],
      items: [
        {
          text: 'Sales Report',
          icon: <ReportIcon />,
          path: '/reports/sales',
          permission: PERMISSIONS.VIEW_SALES_REPORT,
        },
        {
          text: 'Stock Report',
          icon: <ReportIcon />,
          path: '/reports/stock',
          permission: PERMISSIONS.VIEW_STOCK_REPORT,
        },
        {
          text: 'Customer Report',
          icon: <ReportIcon />,
          path: '/reports/customers',
          permission: PERMISSIONS.VIEW_CUSTOMER_REPORT,
        },
      ],
    },
    {
      text: 'AI Analytics',
      icon: <AIIcon />,
      path: '/ai-analytics',
      permission: PERMISSIONS.VIEW_AI_ANALYTICS,
    },
    {
      text: 'User Management',
      icon: <UserManagementIcon />,
      submenu: true,
      onClick: handleUserManagementClick,
      open: userManagementOpen,
      permission: PERMISSIONS.MANAGE_USERS,
      items: [
        {
          text: 'All Users',
          icon: <CustomersIcon />,
          path: '/users',
          permission: PERMISSIONS.MANAGE_USERS,
        },
        {
          text: 'New User',
          icon: <UserManagementIcon />,
          path: '/users/new',
          permission: PERMISSIONS.MANAGE_USERS,
        },
      ],
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ];

  const renderSubMenu = (items) => {
    return (
      <Collapse in={items.open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {items.items.map((subItem) =>

            canAccessMenuItem(user?.role?.code, subItem.permission) && (
              <ListItem
                key={subItem.text}
                disablePadding
                sx={{ pl: 4 }}
                onClick={() => navigate(subItem.path)}
              >
                <ListItemButton selected={isSelected(subItem.path)}>
                  <ListItemIcon>
                    {subItem.icon}
                  </ListItemIcon>
                  <ListItemText primary={subItem.text} />
                </ListItemButton>
              </ListItem>
            )
          )}
        </List>
      </Collapse>
    );
  };

  return (
    <StyledDrawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      drawerWidth={drawerWidth}
    >

      {user && (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar
            src={user.avatar}
            alt={user.firstName}
            sx={{
              width: 64,
              height: 64,
              mb: 1,
              bgcolor: 'primary.main'
            }}
          >
            {!user.avatar && (user.firstName?.charAt(0) || <PersonIcon />)}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold">
            {user.firstName} {user.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {user.role?.name || user.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, width: '100%' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonIcon />}
              fullWidth
              onClick={() => navigate('/profile')}
            >
              Profile
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<LogoutIcon />}
              fullWidth
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      )}
      <Divider />

      <List>
        {menuItems.map((item) => {

          if (item.permission && !canAccessMenuItem(user?.role?.code, item.permission)) {
            return null;
          }

          return (
            <div key={item.text}>
              <ListItem disablePadding>
                {item.submenu ? (
                  <ListItemButton onClick={item.onClick}>
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                    {item.open ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                ) : (
                  <Tooltip title={item.text} placement="right">
                    <ListItemButton
                      selected={isSelected(item.path)}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </Tooltip>
                )}
              </ListItem>
              {item.submenu && renderSubMenu(item)}
            </div>
          );
        })}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar; 