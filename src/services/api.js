import axios from 'axios';


const api = axios.create({
  baseURL: 'http://localhost:5001/api',
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
  
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Giriş işlemi başarısız oldu' };
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
      const response = await api.put(`/users/${id}`, userData);
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
      const response = await api.put('/users/profile', profileData);
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
    getSalesReport: (params) => api.get('/reports/sales', { params }),
    getStockReport: (params) => api.get('/reports/stock', { params }),
    getCustomerReport: (params) => api.get('/reports/customers', { params }),
  },
  
  
  aiAnalytics: {
    getStockPredictions: () => api.get('/ai/stock-predictions'),
    getSalesForecasts: (params) => api.get('/ai/sales-forecasts', { params }),
    getRecommendations: () => api.get('/ai/recommendations'),
  },
};


export { api, authService, userService, apiServices };
export default api; 