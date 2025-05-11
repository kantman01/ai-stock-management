import React, { useEffect } from 'react';
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
  Stack,
  useMediaQuery,
  useTheme
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
  Person as PersonIcon,
  Insights as AIInsightsIcon,
  BugReport as BugReportIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { PERMISSIONS, canAccessMenuItem } from '../../utils/permissions';
import { selectUser, logout } from '../../redux/features/authSlice';

const StyledDrawer = styled(Drawer)(({ theme, drawerWidth }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const Sidebar = ({ open, onClose, drawerWidth = 250 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [stockOpen, setStockOpen] = React.useState(false);
  const [reportsOpen, setReportsOpen] = React.useState(false);
  const [userManagementOpen, setUserManagementOpen] = React.useState(false);
  const [aiMenuOpen, setAIMenuOpen] = React.useState(false);

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

  
  const staffMenuItems = [
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
      text: 'Manage Supplier Orders',
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
      path: '/reports/sales',
      permission: [PERMISSIONS.VIEW_SALES_REPORT, PERMISSIONS.VIEW_STOCK_REPORT, PERMISSIONS.VIEW_CUSTOMER_REPORT],
    },
    {
      text: 'AI Insights',
      icon: <AIInsightsIcon />,
      submenu: true,
      onClick: () => setAIMenuOpen(!aiMenuOpen),
      open: aiMenuOpen,
      permission: [PERMISSIONS.VIEW_AI_ANALYTICS],
      items: [
        {
          text: 'Analytics',
          icon: <AIInsightsIcon />,
          path: '/ai-analytics',
          permission: PERMISSIONS.VIEW_AI_ANALYTICS,
        },
        {
          text: 'Action History',
          icon: <HistoryIcon />,
          path: '/ai-action-history',
          permission: PERMISSIONS.VIEW_AI_ANALYTICS,
        },
      ],
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
  ];

  
  const supplierMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      permission: null, 
    },
    {
      text: 'My Products',
      icon: <InventoryIcon />,
      path: '/stock/products',
      permission: null,
    },
    {
      text: 'Process Orders',
      icon: <OrdersIcon />,
      path: '/supplier-orders',
      permission: null,
    },
  ];

  
  const customerMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      permission: null, 
    },
    {
      text: 'Browse Products',
      icon: <InventoryIcon />,
      path: '/stock/products',
      permission: null,
    },
    {
      text: 'My Orders',
      icon: <OrdersIcon />,
      path: '/orders',
      permission: null,
    },
  ];

  
  let menuItems = staffMenuItems;
  if (user) {
    switch (user.role.code.toLowerCase()) {
      case 'supplier':
        menuItems = supplierMenuItems;
        break;
      case 'customer':
        menuItems = customerMenuItems;
        break;
      default:
        menuItems = staffMenuItems;
    }
  }

  const renderSubMenu = (items) => {
    return (
      <Collapse in={items.open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {items.items.map((subItem) =>
            (subItem.permission === null || canAccessMenuItem(user, subItem.permission)) && (
              <ListItem
                key={subItem.text}
                disablePadding
                sx={{ pl: 4 }}
                onClick={() => {
                  navigate(subItem.path);
                  if (!isDesktop) onClose();
                }}
              >
                <ListItemButton 
                  selected={isSelected(subItem.path)}
                  sx={{
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.main',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      }
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
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

  
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/stock')) {
      setStockOpen(true);
    } else if (currentPath.startsWith('/reports')) {
      setReportsOpen(true);
    } else if (currentPath.startsWith('/users')) {
      setUserManagementOpen(true);
    } else if (currentPath.startsWith('/ai-')) {
      setAIMenuOpen(true);
    }
  }, [location.pathname]);
  
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
     
      {user && (
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          py: 3
        }}>
          <Avatar
            src={user.avatar}
            alt={user.firstName}
            sx={{
              width: 64,
              height: 64,
              mb: 1,
              bgcolor: 'white',
              color: 'primary.main',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            {!user.avatar && ((user.firstName?.charAt(0) || user.companyName?.charAt(0) || <PersonIcon />))}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
            {user.role.code === 'supplier' 
              ? user.supplier?.name
              : `${user.firstName || ''} ${user.lastName || ''}`
            }
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }} gutterBottom>
            {user.role.code === 'supplier' 
              ? 'Supplier' 
              : user.role.code === 'customer' 
                ? 'Customer' 
                : user.role?.code || user.email}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, width: '100%' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonIcon />}
              fullWidth
              onClick={() => navigate(user.role.code === 'supplier' 
                ? '/profile' 
                : user.role.code === 'customer' 
                  ? '/profile' 
                  : '/profile')}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
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
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.2)' } }}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      )}
      <Divider />

      <List sx={{ pt: 1, overflowY: 'auto', flexGrow: 1 }}>
        {menuItems.map((item) => {
          if (item.permission !== null && !canAccessMenuItem(user, item.permission)) {
            return null;
          }

          return (
            <div key={item.text}>
              <ListItem disablePadding>
                {item.submenu ? (
                  <ListItemButton 
                    onClick={item.onClick}
                    sx={{ 
                      py: 1.2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                    {item.open ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                ) : (
                  <Tooltip title={item.text} placement="right">
                    <ListItemButton
                      selected={isSelected(item.path)}
                      onClick={() => { 
                        navigate(item.path);
                        if (!isDesktop) onClose();
                      }}
                      sx={{
                        py: 1.2,
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          '&:hover': {
                            bgcolor: 'primary.main',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'primary.contrastText',
                          }
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
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
    </Box>
  );

  return (
    <>
      {/* Mobile drawer - temporary */}
      {!isDesktop && (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true, 
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              boxShadow: '2px 0 10px rgba(0, 0, 0, 0.15)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Desktop drawer - persistent */}
      {isDesktop && (
        <Drawer
          variant="persistent"
          open={open}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              boxShadow: open ? '2px 0 10px rgba(0, 0, 0, 0.15)' : 'none',
              borderRight: '1px solid rgba(0, 0, 0, 0.05)',
              transform: open ? 'none' : 'translateX(-100%)',
              transition: theme => theme.transitions.create(['transform', 'width', 'box-shadow'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar; 