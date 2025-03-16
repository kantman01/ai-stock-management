import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  filteredItems: [],
  selectedItem: null,
  isLoading: false,
  error: null,
  searchTerm: '',
  filters: {
    category: 'all',
    inStock: 'all',
    sortBy: 'name'
  }
};

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    fetchStockStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchStockSuccess: (state, action) => {
      state.isLoading = false;
      state.items = action.payload;
      state.filteredItems = action.payload;
    },
    fetchStockFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    selectItem: (state, action) => {
      state.selectedItem = action.payload;
    },
    addItem: (state, action) => {
      state.items.push(action.payload);
      state.filteredItems = state.items; 
    },
    updateItem: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
        
        if (state.selectedItem && state.selectedItem.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
        
        state.filteredItems = state.items; 
      }
    },
    deleteItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.filteredItems = state.items;
      
      if (state.selectedItem && state.selectedItem.id === action.payload) {
        state.selectedItem = null;
      }
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      state.filteredItems = applyFilters(state);
    },
    setFilter: (state, action) => {
      state.filters = {
        ...state.filters,
        [action.payload.name]: action.payload.value
      };
      state.filteredItems = applyFilters(state);
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.searchTerm = '';
      state.filteredItems = state.items;
    }
  },
});


const applyFilters = (state) => {
  let filtered = [...state.items];
  
  
  if (state.searchTerm) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(state.searchTerm.toLowerCase())
    );
  }
  
  
  if (state.filters.category !== 'all') {
    filtered = filtered.filter(item => item.category === state.filters.category);
  }
  
  
  if (state.filters.inStock !== 'all') {
    if (state.filters.inStock === 'inStock') {
      filtered = filtered.filter(item => item.quantity > 0);
    } else {
      filtered = filtered.filter(item => item.quantity === 0);
    }
  }
  
  
  filtered.sort((a, b) => {
    if (state.filters.sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (state.filters.sortBy === 'price') {
      return a.price - b.price;
    } else if (state.filters.sortBy === 'quantity') {
      return a.quantity - b.quantity;
    }
    return 0;
  });
  
  return filtered;
};

export const { 
  fetchStockStart, 
  fetchStockSuccess, 
  fetchStockFailure,
  selectItem,
  addItem,
  updateItem,
  deleteItem,
  setSearchTerm,
  setFilter,
  clearFilters
} = stockSlice.actions;

export default stockSlice.reducer; 