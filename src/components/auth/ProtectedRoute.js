import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../../utils/roles';

/**
 * Rol tabanlı rota koruması sağlayan bileşen
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Korunan içerik
 * @param {string|string[]} [props.requiredPermissions] - Gerekli izinler (opsiyonel)
 * @returns {React.ReactNode}
 */
const ProtectedRoute = ({ children, requiredPermissions }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredPermissions) {
    const hasAccess = Array.isArray(requiredPermissions)
      ? requiredPermissions.some(permission => hasPermission(user?.role, permission))
      : hasPermission(user?.role, requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 