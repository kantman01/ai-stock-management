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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  Snackbar,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  ArrowUpward as IncreaseIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const SupplierStock = () => {
  const { user } = useSelector(state => state.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockFormData, setStockFormData] = useState({
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [page, rowsPerPage, searchTerm]);

  const fetchProducts = async () => {
    if (!user?.supplierId) {
      setError('Supplier ID not found. Please contact support.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage
      };

      if (searchTerm) params.search = searchTerm;

      const response = await api.get(`/suppliers/${user.supplierId}/products`, { params });

      setProducts(response.data.data);
      setTotalCount(response.data.pagination.total);
      setError(null);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Products could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleOpenStockDialog = (product) => {
    setSelectedProduct(product);
    setStockFormData({
      quantity: 1,
      notes: ''
    });
    setStockDialogOpen(true);
  };

  const handleCloseStockDialog = () => {
    setStockDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleStockFormChange = (e) => {
    const { name, value } = e.target;
    setStockFormData({
      ...stockFormData,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value
    });
  };

  const handleSubmitStock = async () => {
    if (!selectedProduct) return;

    try {
      const stockData = {
        quantity: stockFormData.quantity,
        notes: stockFormData.notes || `Stock update for ${selectedProduct.name}`
      };

      await api.post(
        `/suppliers/${user.supplierId}/products/${selectedProduct.id}/stock`,
        stockData
      );

      setSnackbar({
        open: true,
        message: 'Stock updated successfully',
        severity: 'success'
      });

      handleCloseStockDialog();
      fetchProducts(); 
    } catch (error) {
      console.error('Error updating stock:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Error updating stock',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* Products Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Current Stock</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category_name || 'Uncategorized'}</TableCell>
                      <TableCell align="right">${parseFloat(product.price).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={product.supplier_stock_quantity || 0}
                          color={
                            (product.supplier_stock_quantity || 0) <= 0 ? 'error' :
                            (product.supplier_stock_quantity || 0) <= 5 ? 'warning' : 'success'
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenStockDialog(product)}
                          title="Add Stock"
                        >
                          <IncreaseIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
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
          />
        </Paper>
      )}

      {/* Stock Update Dialog */}
      <Dialog open={stockDialogOpen} onClose={handleCloseStockDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Update Stock: {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Current Stock: {selectedProduct?.supplier_stock_quantity || 0}
            </Typography>
            
            <TextField
              fullWidth
              label="Add Quantity"
              name="quantity"
              type="number"
              value={stockFormData.quantity}
              onChange={handleStockFormChange}
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ mt: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              multiline
              rows={3}
              value={stockFormData.notes}
              onChange={handleStockFormChange}
              sx={{ mt: 2 }}
              placeholder="Optional notes about this stock update"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStockDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitStock}
            disabled={stockFormData.quantity < 1}
            startIcon={<AddIcon />}
          >
            Add Stock
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

export default SupplierStock; 