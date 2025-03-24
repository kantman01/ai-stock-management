/**
 * System roles and role-based permissions definitions
 */
import store from '../redux/store';
export const ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  WAREHOUSE: 'warehouse'
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',

  VIEW_USERS: 'VIEW_USERS',
  MANAGE_USERS: 'MANAGE_USERS',

  VIEW_PRODUCTS: 'VIEW_PRODUCTS',
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',

  VIEW_CATEGORIES: 'VIEW_CATEGORIES',
  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',

  VIEW_INVENTORY: 'VIEW_INVENTORY',
  MANAGE_INVENTORY: 'MANAGE_INVENTORY',
  VIEW_STOCK_MOVEMENTS: 'VIEW_STOCK_MOVEMENTS',

  VIEW_ORDERS: 'VIEW_ORDERS',
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  APPROVE_ORDERS: 'APPROVE_ORDERS',
  CREATE_ORDERS: 'CREATE_ORDERS',

  VIEW_CUSTOMERS: 'VIEW_CUSTOMERS',
  MANAGE_CUSTOMERS: 'MANAGE_CUSTOMERS',

  VIEW_SUPPLIERS: 'VIEW_SUPPLIERS',
  MANAGE_SUPPLIERS: 'MANAGE_SUPPLIERS',

  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  VIEW_SALES_REPORT: 'VIEW_SALES_REPORT',
  VIEW_STOCK_REPORT: 'VIEW_STOCK_REPORT',
  VIEW_CUSTOMER_REPORT: 'VIEW_CUSTOMER_REPORT',

  VIEW_AI_ANALYTICS: 'VIEW_AI_ANALYTICS',

  MANAGE_SETTINGS: 'MANAGE_SETTINGS'
};

export const hasPermission = (userRole, permission) => {
  if (!permission) return false;

  const state = store.getState();
  const { permissions } = state.auth;

  return permissions.includes(permission);
};

export const canAccessMenuItem = (userRole, requiredPermissions) => {
  if (!requiredPermissions) return false;

  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some(permission => hasPermission(userRole, permission));
  }

  return hasPermission(userRole, requiredPermissions);
}; 