import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn, hasPermission } from '../redux/features/authSlice';

/**
 * A route component that requires authentication and optionally specific permissions.
 * If user is not logged in, they are redirected to the login page.
 * If user does not have the required permission, they are redirected to an unauthorized page.
 */
const PrivateRoute = ({ children, requiredPermission }) => {
  const location = useLocation();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const userHasPermission = useSelector((state) => 
    requiredPermission ? hasPermission(state, requiredPermission) : true
  );
  
  if (!isLoggedIn) {
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  
  
  
  
  
  
  console.log('PrivateRoute - Permission check:', {
    requiredPermission,
    userHasPermission,
    path: location.pathname
  });
  
  
  return children;
};

export default PrivateRoute; 