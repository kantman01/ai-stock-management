import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
  useTheme
} from '@mui/material';

import theme from '../../assets/styles/theme';
import Header from './Header';
import Sidebar from './Sidebar';
import { selectIsLoggedIn } from '../../redux/features/authSlice';

const drawerWidth = 250;

const MainLayout = () => {
  const customTheme = useTheme();
  const isDesktop = useMediaQuery(customTheme.breakpoints.up('md'));
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {isLoggedIn && (
          <>
            <Header
              sidebarOpen={sidebarOpen}
              toggleSidebar={toggleSidebar}
              drawerWidth={drawerWidth}
            />
            <Sidebar
              open={sidebarOpen}
              onClose={() => !isDesktop && setSidebarOpen(false)}
              drawerWidth={sidebarOpen ? drawerWidth : 0}
            />
          </>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { 
              xs: '100%', 
              md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' 
            },
            marginLeft: { 
              xs: 0, 
              md: sidebarOpen ? `${drawerWidth}px` : 0 
            },
            mt: isLoggedIn ? '64px' : 0,
            transition: theme => theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MainLayout; 