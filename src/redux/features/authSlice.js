import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/api';

const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, userType = 'staff' }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password, userType);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Invalid email or password. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get user information');
    }
  }
);

export const fetchUserPermissions = createAsyncThunk(
  'auth/fetchUserPermissions',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await authService.getUserPermissions(userId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch permissions');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null,
    isLoggedIn: !!storedToken,
    isAuthenticated: !!storedToken,
    permissions: storedUser ? JSON.parse(storedUser).role?.permissions || [] : [],
    loading: false,
    error: null,
  },
  reducers: {
    updateCurrentUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      state.isAuthenticated = false;
      state.permissions = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = true;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    loginFailure: (state, action) => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = action.payload;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isLoggedIn = true;
        state.isAuthenticated = true;
        state.permissions = action.payload.user.role?.permissions || [];
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.permissions = action.payload.role?.permissions || [];
        state.error = null;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchUserPermissions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.permissions = action.payload;
        state.loading = false;
        if (state.user) {
          state.user = {
            ...state.user,
            role: {
              ...state.user.role,
              permissions: action.payload
            }
          };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  updateCurrentUser,
  logout, 
  clearError,
  loginStart,
  loginSuccess,
  loginFailure,
  setLoading
} = authSlice.actions;

export const selectIsLoggedIn = (state) => state.auth.isLoggedIn;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectPermissions = (state) => {
  const user = state.auth.user;
  return user && user.role && user.role.permissions ? user.role.permissions : state.auth.permissions;
};
export const selectIsLoading = (state) => state.auth.loading;
export const selectError = (state) => state.auth.error;

export const hasPermission = (state, permission) => {
  const permissions = selectPermissions(state);
  return permissions.includes(permission);
};

export default authSlice.reducer; 