import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';


import authReducer from './features/authSlice';
import stockReducer from './slices/stockSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  stock: stockReducer,
  
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store; 