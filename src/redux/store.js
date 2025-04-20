import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

import authReducer from './features/authSlice';
import stockReducer from './slices/stockSlice';
import aiReducer from './slices/aiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  stock: stockReducer,
  ai: aiReducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store; 