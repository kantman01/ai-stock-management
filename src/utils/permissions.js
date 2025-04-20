/**
 * Permission constants for the application
 */
export const PERMISSIONS = {
  
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  
  
  VIEW_PRODUCTS: 'VIEW_PRODUCTS',
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',
  VIEW_CATEGORIES: 'VIEW_CATEGORIES',
  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',
  
  
  VIEW_STOCK_MOVEMENTS: 'VIEW_STOCK_MOVEMENTS',
  MANAGE_INVENTORY: 'MANAGE_INVENTORY',
  
  
  VIEW_ORDERS: 'VIEW_ORDERS',
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  CREATE_ORDERS: 'CREATE_ORDERS',
  
  
  VIEW_SUPPLIERS: 'VIEW_SUPPLIERS',
  MANAGE_SUPPLIERS: 'MANAGE_SUPPLIERS',
  
  
  VIEW_CUSTOMERS: 'VIEW_CUSTOMERS',
  MANAGE_CUSTOMERS: 'MANAGE_CUSTOMERS',
  
  
  VIEW_SALES_REPORT: 'VIEW_SALES_REPORT',
  VIEW_STOCK_REPORT: 'VIEW_STOCK_REPORT', 
  VIEW_CUSTOMER_REPORT: 'VIEW_CUSTOMER_REPORT',
  
  
  MANAGE_USERS: 'MANAGE_USERS',
  
  
  VIEW_AI_ANALYTICS: 'VIEW_AI_ANALYTICS',
  MANAGE_AI_SETTINGS: 'MANAGE_AI_SETTINGS',
  
  
  VIEW_OWN_ORDERS: 'VIEW_OWN_ORDERS',
  MANAGE_OWN_ORDERS: 'MANAGE_OWN_ORDERS',
  
  
  VIEW_OWN_SUPPLIER_ORDERS: 'VIEW_OWN_SUPPLIER_ORDERS',
  MANAGE_OWN_SUPPLIER_ORDERS: 'MANAGE_OWN_SUPPLIER_ORDERS'
};

/**
 * Check if the user has the required permission
 * @param {Object} role - User role object
 * @param {string|Array} requiredPermission - Required permission(s)
 * @returns {boolean} - Whether the user has the permission
 */
export const hasPermission = (role, requiredPermission) => {
  if (!role) {
    return false;
  }
  
  
  if (role.code === 'ADMIN') {
    return true;
  }
  
  if (!role.permissions) {
    return false;
  }
  
  
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(perm => role.permissions.includes(perm));
  }
  
  
  return role.permissions.includes(requiredPermission);
};

/**
 * Check if the user can access a menu item based on their role
 * @param {Object} user - User object
 * @param {string|Array} requiredPermission - Required permission(s)
 * @returns {boolean} - Whether the user can access the menu item
 */
export const canAccessMenuItem = (user, requiredPermission) => {
  
  if (!requiredPermission) {
    return true;
  }
  
  
  if (!user || !user.role) {
    return false;
  }
  
  
  if (user.role.code.toLowerCase() === 'admin') {
    return true;
  }
  
  
  if (!user.role.permissions) {
    return false;
  }
  
  
  if (Array.isArray(requiredPermission)) {
    console.log("user.role.permissions",user.role.permissions);
    return requiredPermission.some(perm => user.role.permissions.includes(perm));
  }
  
  
  return user.role.permissions.includes(requiredPermission);
}; 