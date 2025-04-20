/**
 * API Utilities for role-based request parameter handling
 */
import store from '../redux/store';

/**
 * Adds role-specific parameters to API requests
 * @param {Object} params - Original request parameters
 * @returns {Object} - Updated parameters with role-specific filters
 */
export const addRoleBasedParams = (params = {}) => {
  const state = store.getState();
  const user = state.auth.user;
  
  if (!user) return params;
  
  
  const updatedParams = { ...params };
  
  
  switch (user.role?.code) {
    case 'supplier':
      if (user.supplierId) {
        updatedParams.supplier_id = user.supplierId;
      }
      break;
    case 'customer':
      if (user.customerId) {
        updatedParams.customer_id = user.customerId;
      }
      break;
    default:
      
      break;
  }
  
  return updatedParams;
};

/**
 * Utility for product-related API requests
 */
export const productApiUtils = {
  /**
   * Get parameters for product listing based on user role
   * @param {Object} params - Original request parameters
   * @returns {Object} - Updated parameters
   */
  getListParams: (params = {}) => {
    const state = store.getState();
    const user = state.auth.user;
    
    if (!user) return params;
    
    const updatedParams = { ...params };
    
    if (user.role?.code === 'supplier' && user.supplierId) {
      updatedParams.supplier_id = user.supplierId;
    }
    
    return updatedParams;
  }
};

/**
 * Utility for order-related API requests
 */
export const orderApiUtils = {
  /**
   * Get parameters for order listing based on user role
   * @param {Object} params - Original request parameters
   * @returns {Object} - Updated parameters
   */
  getListParams: (params = {}) => {
    const state = store.getState();
    const user = state.auth.user;
    
    if (!user) return params;
    
    const updatedParams = { ...params };
    
    if (user.role?.code === 'customer' && user.customerId) {
      updatedParams.customer_id = user.customerId;
    }
    
    return updatedParams;
  }
};

/**
 * Utility for supplier order-related API requests
 */
export const supplierOrderApiUtils = {
  /**
   * Get parameters for supplier order listing based on user role
   * @param {Object} params - Original request parameters
   * @returns {Object} - Updated parameters
   */
  getListParams: (params = {}) => {
    const state = store.getState();
    const user = state.auth.user;
    
    if (!user) return params;
    
    const updatedParams = { ...params };
    
    if (user.role?.code === 'supplier' && user.supplierId) {
      updatedParams.supplier_id = user.supplierId;
    }
    
    return updatedParams;
  }
}; 