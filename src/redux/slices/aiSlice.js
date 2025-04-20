import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiServices } from '../../services/api';


export const fetchStockPredictions = createAsyncThunk(
  'ai/fetchStockPredictions',
  async (useCache = true, { rejectWithValue }) => {
    try {
      const response = useCache 
        ? await apiServices.aiAnalytics.getStockPredictions()
        : await apiServices.aiAnalytics.getStockPredictions({ useCache: 'false' });
      
      
      console.log('Stock prediction response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Stock prediction error:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSalesForecasts = createAsyncThunk(
  'ai/fetchSalesForecasts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await apiServices.aiAnalytics.getSalesForecasts(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load sales forecasts');
    }
  }
);

export const fetchRecommendations = createAsyncThunk(
  'ai/fetchRecommendations',
  async (useCache = true, { rejectWithValue }) => {
    try {
      const response = useCache
        ? await apiServices.aiAnalytics.getRecommendations()
        : await apiServices.aiAnalytics.getRecommendations({ useCache: 'false' });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load recommendations');
    }
  }
);

export const fetchLatestAnalytics = createAsyncThunk(
  'ai/fetchLatestAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiServices.aiAnalytics.getLatestAnalytics();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const applyStockPredictions = createAsyncThunk(
  'ai/applyStockPredictions',
  async ({ predictions, predictionId }, { rejectWithValue }) => {
    try {
      const response = await apiServices.aiAnalytics.applyStockPredictions(predictions, predictionId);
      return response.data;
    } catch (error) {
      console.error('Error applying stock predictions:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  stockPredictions: null,
  salesForecasts: null,
  recommendations: null,
  loading: {
    stockPredictions: false,
    salesForecasts: false,
    recommendations: false,
    latestAnalytics: false,
    applyPredictions: false
  },
  error: {
    stockPredictions: null,
    salesForecasts: null,
    recommendations: null,
    latestAnalytics: null,
    applyPredictions: null
  },
  lastFetched: {
    stockPredictions: null,
    salesForecasts: null,
    recommendations: null
  },
  applyResults: null
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = initialState.error;
    },
    resetAiState: () => initialState,
  },
  extraReducers: (builder) => {
    
    builder
      .addCase(fetchStockPredictions.pending, (state) => {
        state.loading.stockPredictions = true;
        state.error.stockPredictions = null;
      })
      .addCase(fetchStockPredictions.fulfilled, (state, action) => {
        state.stockPredictions = action.payload;
        state.loading.stockPredictions = false;
        state.lastFetched.stockPredictions = Date.now();
      })
      .addCase(fetchStockPredictions.rejected, (state, action) => {
        state.loading.stockPredictions = false;
        state.error.stockPredictions = action.payload || 'An error occurred';
      })
      
      
      .addCase(fetchSalesForecasts.pending, (state) => {
        state.loading.salesForecasts = true;
        state.error.salesForecasts = null;
      })
      .addCase(fetchSalesForecasts.fulfilled, (state, action) => {
        state.salesForecasts = action.payload;
        state.loading.salesForecasts = false;
        state.lastFetched.salesForecasts = Date.now();
      })
      .addCase(fetchSalesForecasts.rejected, (state, action) => {
        state.loading.salesForecasts = false;
        state.error.salesForecasts = action.payload || 'An error occurred';
      })
      
      
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading.recommendations = true;
        state.error.recommendations = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.recommendations = action.payload;
        state.loading.recommendations = false;
        state.lastFetched.recommendations = Date.now();
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading.recommendations = false;
        state.error.recommendations = action.payload || 'An error occurred';
      })

      
      .addCase(fetchLatestAnalytics.pending, (state) => {
        state.loading.latestAnalytics = true;
        state.error.latestAnalytics = null;
      })
      .addCase(fetchLatestAnalytics.fulfilled, (state, action) => {
        state.loading.latestAnalytics = false;
        
        
        if (action.payload.data.stockPredictions) {
          state.stockPredictions = {
            predictions: action.payload.data.stockPredictions.predictions
          };
          state.lastFetched.stockPredictions = action.payload.data.stockPredictions.timestamp;
        }
        
        
        if (action.payload.data.salesForecasts) {
          state.salesForecasts = {
            forecasts: action.payload.data.salesForecasts.forecasts
          };
          state.lastFetched.salesForecasts = action.payload.data.salesForecasts.timestamp;
        }
        
        
        if (action.payload.data.recommendations) {
          state.recommendations = {
            recommendations: action.payload.data.recommendations.recommendations
          };
          state.lastFetched.recommendations = action.payload.data.recommendations.timestamp;
        }
      })
      .addCase(fetchLatestAnalytics.rejected, (state, action) => {
        state.loading.latestAnalytics = false;
        state.error.latestAnalytics = action.payload;
      })

      
      .addCase(applyStockPredictions.pending, (state) => {
        state.loading.applyPredictions = true;
        state.error.applyPredictions = null;
        state.applyResults = null;
      })
      .addCase(applyStockPredictions.fulfilled, (state, action) => {
        state.loading.applyPredictions = false;
        state.applyResults = action.payload;
      })
      .addCase(applyStockPredictions.rejected, (state, action) => {
        state.loading.applyPredictions = false;
        state.error.applyPredictions = action.payload || 'An error occurred';
      });
  },
});

export const { clearErrors, resetAiState } = aiSlice.actions;


export const selectStockPredictions = (state) => state.ai.stockPredictions;
export const selectSalesForecasts = (state) => state.ai.salesForecasts;
export const selectRecommendations = (state) => state.ai.recommendations;
export const selectAiLoading = (state) => state.ai.loading;
export const selectAiErrors = (state) => state.ai.error;
export const selectLastFetched = (state) => state.ai.lastFetched;

export default aiSlice.reducer; 