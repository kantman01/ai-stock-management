import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider 
} from '@mui/material';

import theme from '../../assets/styles/theme';
import Header from './Header';
import Sidebar from './Sidebar';
import { selectIsLoggedIn } from '../../redux/features/authSlice';


const drawerWidth = 250;

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
              onClose={() => setSidebarOpen(false)}
              drawerWidth={drawerWidth}
            />
          </>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)` },
            ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
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