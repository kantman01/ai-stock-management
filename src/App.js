import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';


import MainLayout from './components/layout/MainLayout';


import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Products from './pages/stock/Products';
import Categories from './pages/stock/Categories';
import StockMovements from './pages/stock/StockMovements';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import UserForm from './pages/UserForm';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';


import PrivateRoute from './components/PrivateRoute';
import { PERMISSIONS } from './utils/roles';
import { selectIsLoggedIn } from './redux/features/authSlice';


import { getCurrentUser } from './redux/features/authSlice';


import api from './services/api';


const PublicRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const location = useLocation();
  
  
  const publicPaths = ['/login', '/register', '/unauthorized'];
  const isPublicPath = publicPaths.includes(location.pathname);
  
  
  if (isLoggedIn && isPublicPath) {
    return <Navigate to="/dashboard" replace />;
  }
  
  
  if (!isLoggedIn && !isPublicPath && location.pathname !== '/') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector(state => state.auth);
  
  
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !isLoggedIn) {
        dispatch(getCurrentUser());
      }
    };
    
    checkAuth();
  }, [dispatch, isLoggedIn]);

  return (
    <PublicRoute>
      <Routes>
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        
        <Route path="/" element={
          isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
        
        
        <Route path="/" element={<MainLayout />}>
          
          
          <Route 
            path="dashboard" 
            element={
              <PrivateRoute requiredPermission={PERMISSIONS.VIEW_DASHBOARD}>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          
          
          <Route path="stock">
            <Route 
              path="products" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_PRODUCTS}>
                  <Products />
                </PrivateRoute>
              } 
            />
            <Route 
              path="categories" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_CATEGORIES}>
                  <Categories />
                </PrivateRoute>
              } 
            />
            <Route 
              path="movements" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_STOCK_MOVEMENTS}>
                  <StockMovements />
                </PrivateRoute>
              } 
            />
          </Route>
          
          
          <Route 
            path="orders" 
            element={
              <PrivateRoute requiredPermission={PERMISSIONS.VIEW_ORDERS}>
                <Orders />
              </PrivateRoute>
            } 
          />
          
          
          <Route 
            path="customers" 
            element={
              <PrivateRoute requiredPermission={PERMISSIONS.VIEW_CUSTOMERS}>
                <Customers />
              </PrivateRoute>
            } 
          />
          
          
          <Route 
            path="suppliers" 
            element={
              <PrivateRoute requiredPermission={PERMISSIONS.VIEW_SUPPLIERS}>
                <Suppliers />
              </PrivateRoute>
            } 
          />
          
          
          <Route 
            path="ai-analytics" 
            element={
              <PrivateRoute requiredPermission={PERMISSIONS.VIEW_AI_ANALYTICS}>
              </PrivateRoute>
            } 
          />
          
          
          <Route path="reports">
            <Route 
              path="sales" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_SALES_REPORT}>
                  <Reports type="sales" />
                </PrivateRoute>
              } 
            />
            <Route 
              path="stock" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_STOCK_REPORT}>
                  <Reports type="stock" />
                </PrivateRoute>
              } 
            />
            <Route 
              path="customers" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.VIEW_CUSTOMER_REPORT}>
                  <Reports type="customers" />
                </PrivateRoute>
              } 
            />
          </Route>
          
          
          <Route path="users">
            <Route 
              index
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
                  <UserManagement />
                </PrivateRoute>
              } 
            />
            <Route 
              path="new" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
                  <UserForm />
                </PrivateRoute>
              } 
            />
            <Route 
              path=":id" 
              element={
                <PrivateRoute requiredPermission={PERMISSIONS.MANAGE_USERS}>
                  <UserForm />
                </PrivateRoute>
              } 
            />
          </Route>
          
          
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PublicRoute>
  );
}

export default App;
