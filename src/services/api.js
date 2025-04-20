import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenFirstChars: token ? token.substring(0, 10) + '...' : 'none'
    });

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {

    if (error.response) {
      console.log('API Error Response:', {
        url: error.config.url,
        method: error.config.method,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      if (error.response.status === 401 || error.response.status === 403) {

        if (error.response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

const authService = {

  login: async (email, password, userType = 'staff') => {
    try {
      const response = await api.post('/auth/login', { email, password, userType });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Kullanıcı bilgileri alınamadı' };
    }
  },

  getUserPermissions: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/permissions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch permissions' };
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Şifre değiştirme başarısız oldu' };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Şifre sıfırlama isteği başarısız oldu' };
    }
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Şifre sıfırlama başarısız oldu' };
    }
  }
};

const userService = {

  getUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Kullanıcı listesi alınamadı' };
    }
  },

  getUserById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Kullanıcı bilgileri alınamadı' };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Kullanıcı oluşturma başarısız oldu' };
    }
  },

  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/profile/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Kullanıcı güncelleme başarısız oldu' };
    }
  },

  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'User deletion failed' };
    }
  },

  getRoles: async () => {
    try {
      const response = await api.get('/users/roles');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Role list failed' };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/me', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Profile update failed' };
    }
  }
};

const apiServices = {

  users: userService,

  products: {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (productData) => api.post('/products', productData),
    update: (id, productData) => api.put(`/products/${id}`, productData),
    delete: (id) => api.delete(`/products/${id}`),
    uploadImage: (formData, onUploadProgress) => {
      return api.post('/products/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress
      });
    }
  },

  categories: {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
    create: (categoryData) => api.post('/categories', categoryData),
    update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
    delete: (id) => api.delete(`/categories/${id}`),
  },

  stockMovements: {
    getAll: (params) => api.get('/stock-movements', { params }),
    getById: (id) => api.get(`/stock-movements/${id}`),
    create: (movementData) => api.post('/stock-movements', movementData),
  },

  orders: {
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    create: (orderData) => api.post('/orders', orderData),
    update: (id, orderData) => api.put(`/orders/${id}`, orderData),
    delete: (id) => api.delete(`/orders/${id}`),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  },

  customers: {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (customerData) => api.post('/customers', customerData),
    update: (id, customerData) => api.put(`/customers/${id}`, customerData),
    delete: (id) => api.delete(`/customers/${id}`),
  },

  suppliers: {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (supplierData) => api.post('/suppliers', supplierData),
    update: (id, supplierData) => api.put(`/suppliers/${id}`, supplierData),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  reports: {
    getAll: (params) => api.get('/reports', { params }),
    getById: (id) => api.get(`/reports/${id}`),
    create: (reportData) => api.post('/reports', reportData),
    delete: (id) => api.delete(`/reports/${id}`),
  },

  aiAnalytics: {
    getStockPredictions: (params) => api.get('/ai/stock-predictions', { params }),
    applyStockPredictions: (predictions, predictionId) => api.post('/ai/stock-predictions/apply', { 
      predictions, 
      predictionId 
    }),
    getSalesForecasts: (params) => api.get('/ai/sales-forecasts', { params }),
    getRecommendations: (params) => api.get('/ai/recommendations', { params }),
    processOrder: (orderId) => api.post(`/ai/orders/${orderId}/analyze`),
    runInventoryAnalysis: () => api.post('/ai/inventory/analyze'),
    getRecentActions: (limit) => api.get('/ai/actions', { params: { limit } }),
    getActions: (params) => api.get('/ai/actions', { params }),
    getInteractions: (params) => api.get('/ai/interactions', { params }),
    getLatestAnalytics: () => api.get('/ai/latest-analytics')
  },

  notifications: {
    getAll: () => api.get('/notifications'),
    create: (data) => api.post('/notifications', data),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`)
  },

  supplierOrders: {
    getAll: (params) => api.get('/supplier-orders', { params }),
    getById: (id) => api.get(`/supplier-orders/${id}`),
    create: (data) => api.post('/supplier-orders', data),
    update: (id, data) => api.put(`/supplier-orders/${id}`, data),
    updateStatus: (id, status) => api.put(`/supplier-orders/${id}/status`, { status }),
    complete: (id) => api.post(`/supplier-orders/${id}/complete`),
    delete: (id) => api.delete(`/supplier-orders/${id}`)
  },

  dashboard: {
    getStats: () => api.get('/dashboard/stats'),
    getSales: () => api.get('/dashboard/sales'),
    getActivities: () => api.get('/dashboard/activities'),
    getSupplierStats: (params) => api.get('/dashboard/supplier-stats', { params }),
    getCustomerStats: (params) => api.get('/dashboard/customer-stats', { params })
  },
};
 
export { api, authService, userService, apiServices };
export default api; 