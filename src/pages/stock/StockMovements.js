import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Chip,
  Alert,
  Grid,
  Stack,
  InputAdornment,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ArrowUpward as IncreaseIcon,
  ArrowDownward as DecreaseIcon,
  SwapHoriz as TransferIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/roles';
import { PERMISSIONS } from '../../utils/roles';
import api from '../../services/api';


const MOVEMENT_TYPES = {
  RECEIPT: 'receipt',
  SALE: 'sale',
  RETURN_FROM_CUSTOMER: 'return_from_customer',
  RETURN_TO_SUPPLIER: 'return_to_supplier',
  ADJUSTMENT_ADD: 'adjustment_add',
  ADJUSTMENT_REMOVE: 'adjustment_remove',
  WASTE: 'waste'
};


const MOVEMENT_TYPE_LABELS = {
  [MOVEMENT_TYPES.RECEIPT]: 'Receipt',
  [MOVEMENT_TYPES.SALE]: 'Sale',
  [MOVEMENT_TYPES.RETURN_FROM_CUSTOMER]: 'Return from Customer',
  [MOVEMENT_TYPES.RETURN_TO_SUPPLIER]: 'Return to Supplier',
  [MOVEMENT_TYPES.ADJUSTMENT_ADD]: 'Adjustment (+)',
  [MOVEMENT_TYPES.ADJUSTMENT_REMOVE]: 'Adjustment (-)',
  [MOVEMENT_TYPES.WASTE]: 'Waste'
};


const MOVEMENT_REASONS = {
  SUPPLY: 'Supply',
  ORDER: 'Order',
  CUSTOMER_RETURN: 'Customer Return',
  SUPPLIER_RETURN: 'Supplier Return',
  ADJUSTMENT: 'Stock Adjustment',
  DAMAGE: 'Damage/Loss',
  WASTE: 'Waste'
};

const StockMovements = () => {
  const { user } = useSelector(state => state.auth);
  const canManageStockMovements = hasPermission(user?.role, PERMISSIONS.MANAGE_STOCK_MOVEMENTS);
  
  const [stockMovements, setStockMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    startDate: null,
    endDate: null
  });
  
  
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    type: MOVEMENT_TYPES.RECEIPT,
    quantity: 1,
    notes: ''
  });
  
  
  const fetchStockMovements = async () => {
    setLoading(true);
    try {
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage
      };
      
      
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.start_date = filters.startDate.format('YYYY-MM-DD');
      if (filters.endDate) params.end_date = filters.endDate.format('YYYY-MM-DD');
      
      const response = await api.get('/stock-movements', params);
      
      setStockMovements(response.data.data);
      setTotalCount(response.data.pagination.total);
      setFilteredMovements(response.data.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      setError('Stock movements could not be loaded');
    } finally {
      setLoading(false);
    }
  };
  
  
  const fetchProducts = async () => {
    try {
      const response = await api.products.getAll();
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  
  useEffect(() => {
    fetchStockMovements();
  }, [page, rowsPerPage, filters]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    setPage(0); 
  };
  
  const handleDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date
    });
    setPage(0); 
  };
  
  const handleOpenAddDialog = () => {
    setFormData({
      product_id: '',
      type: MOVEMENT_TYPES.RECEIPT,
      quantity: 1,
      notes: ''
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async () => {
    try {
      const movementData = {
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        type: formData.type,
        notes: formData.notes
      };
      
      await api.stockMovements.create(movementData);
      
      
      fetchStockMovements();
      
      setSnackbar({
        open: true,
        message: 'Stock movement created successfully',
        severity: 'success'
      });
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating stock movement:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Error creating stock movement',
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const getMovementTypeIcon = (type) => {
    if (type.includes('receipt') || type.includes('return_from') || type.includes('add')) {
      return <IncreaseIcon color="success" />;
    } else if (type.includes('sale') || type.includes('return_to') || type.includes('remove') || type.includes('waste')) {
      return <DecreaseIcon color="error" />;
    } else {
      return <TransferIcon color="primary" />;
    }
  };
  
  const getMovementTypeChip = (type) => {
    const label = MOVEMENT_TYPE_LABELS[type] || type;
    let color;
    
    if (type.includes('receipt') || type.includes('return_from') || type.includes('add')) {
      color = 'success';
    } else if (type.includes('sale') || type.includes('return_to') || type.includes('remove') || type.includes('waste')) {
      color = 'error';
    } else {
      color = 'primary';
    }
    
    return (
      <Chip
        icon={getMovementTypeIcon(type)}
        label={label}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Stock Movements
        </Typography>
        
        {canManageStockMovements && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            New Stock Movement
          </Button>
        )}
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Filters
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              name="search"
              label="Search"
              variant="outlined"
              fullWidth
              value={filters.search}
              onChange={handleFilterChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Movement Type</InputLabel>
              <Select
                name="type"
                value={filters.type}
                label="Movement Type"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <Typography variant="body2">-</Typography>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Stack>
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Stock Movements Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%' }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Transaction</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="center">Previous Quantity</TableCell>
                  <TableCell align="center">New Quantity</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Updated By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {getMovementTypeChip(movement.type)}
                    </TableCell>
                    <TableCell>
                      {movement.product_name}
                    </TableCell>
                    <TableCell align="center">
                      {movement.quantity}
                    </TableCell>
                    <TableCell align="center">
                      {movement.previous_quantity}
                    </TableCell>
                    <TableCell align="center">
                      {movement.new_quantity}
                    </TableCell>
                    <TableCell>
                      {movement.notes}
                    </TableCell>
                    <TableCell>
                      {dayjs(movement.created_at).format('DD.MM.YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      {movement.first_name && movement.last_name 
                        ? `${movement.first_name} ${movement.last_name}` 
                        : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No stock movements found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
          />
        </Paper>
      )}
      
      {/* Add Stock Movement Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Add New Stock Movement
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Product</InputLabel>
                <Select
                  name="product_id"
                  value={formData.product_id}
                  label="Product"
                  onChange={handleFormChange}
                >
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label="Movement Type"
                  onChange={handleFormChange}
                >
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="quantity"
                label="Quantity"
                type="number"
                fullWidth
                required
                InputProps={{ inputProps: { min: 1 } }}
                value={formData.quantity}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={
              !formData.product_id ||
              !formData.quantity ||
              !formData.type
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockMovements; 