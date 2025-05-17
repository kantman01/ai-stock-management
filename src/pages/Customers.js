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
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Grid,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import api from '../services/api';

const mockCustomers = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '+1 555 123 4567',
    address: 'Central District, New York',
    order_count: 8,
    total_spent: 12450.75,
    created_at: '2023-01-15T10:30:00'
  },
  {
    id: 2,
    first_name: 'Emma',
    last_name: 'Johnson',
    email: 'emma.johnson@example.com',
    phone: '+1 555 234 5678',
    address: 'Downtown, Chicago',
    order_count: 5,
    total_spent: 7800.50,
    created_at: '2023-02-22T14:45:00'
  },
  {
    id: 3,
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.brown@example.com',
    phone: '+1 555 345 6789',
    address: 'Westside, Los Angeles',
    order_count: 3,
    total_spent: 4300.25,
    created_at: '2023-03-10T09:15:00'
  },
  {
    id: 4,
    first_name: 'Sarah',
    last_name: 'Wilson',
    email: 'sarah.wilson@example.com',
    phone: '+1 555 456 7890',
    address: 'North End, Boston',
    order_count: 10,
    total_spent: 15600.00,
    created_at: '2023-01-05T16:20:00'
  },
  {
    id: 5,
    first_name: 'David',
    last_name: 'Taylor',
    email: 'david.taylor@example.com',
    phone: '+1 555 567 8901',
    address: 'Marina District, San Francisco',
    order_count: 2,
    total_spent: 3250.75,
    created_at: '2023-04-18T11:30:00'
  }
];

const Customers = () => {
  const { user } = useSelector(state => state.auth);
  const canManageCustomers = hasPermission(user, PERMISSIONS.MANAGE_CUSTOMERS);

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');

  const [viewMode, setViewMode] = useState('table');

  const [openAddEditDialog, setOpenAddEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    company_name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    notes: ''
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        setCustomers(mockCustomers);
        setFilteredCustomers(mockCustomers);
        setError(null);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to load customers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredCustomers(filtered);
    setPage(0);
  }, [searchTerm, customers]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleAddClick = () => {
    setCurrentCustomer(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      company_name: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      notes: ''
    });
    setOpenAddEditDialog(true);
  };

  const handleEditClick = (customer) => {
    setCurrentCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      password: '',
      phone: customer.phone,
      company_name: customer.company_name || '',
      address: customer.address,
      city: customer.city || '',
      state: customer.state || '',
      postal_code: customer.postal_code || '',
      country: customer.country || '',
      notes: customer.notes || ''
    });
    setOpenAddEditDialog(true);
  };

  const handleDeleteClick = (customer) => {
    setCurrentCustomer(customer);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenAddEditDialog(false);
    setOpenDeleteDialog(false);
    setCurrentCustomer(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required for new customer account';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.phone) {
      errors.phone = 'Phone is required';
    }
    
    if (!formData.address) {
      errors.address = 'Address is required';
    }
    
    if (!formData.city) {
      errors.city = 'City is required';
    }
    
    if (!formData.state) {
      errors.state = 'State/Province is required';
    }
    
    if (!formData.postal_code) {
      errors.postal_code = 'Postal Code is required';
    }
    
    if (!formData.country) {
      errors.country = 'Country is required';
    }
    
    setError(Object.keys(errors).length > 0 ? Object.values(errors).join('\n') : null);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentCustomer) {
        const updatedCustomers = customers.map(customer =>
          customer.id === currentCustomer.id ? {
            ...customer,
            ...formData
          } : customer
        );

        setCustomers(updatedCustomers);
      } else {
        const newCustomer = {
          id: Math.max(...customers.map(c => c.id)) + 1,
          ...formData,
          order_count: 0,
          total_spent: 0,
          created_at: new Date().toISOString()
        };

        setCustomers([...customers, newCustomer]);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving customer:', error);
      setError('Failed to save customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setLoading(true);
    setError(null);

    try {
      const updatedCustomers = customers.filter(
        customer => customer.id !== currentCustomer.id
      );

      setCustomers(updatedCustomers);
      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError('Failed to delete customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTableView = () => (
    <Paper sx={{ width: '100%' }}>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="center">Orders Count</TableCell>
              <TableCell align="right">Total Spent</TableCell>
              {canManageCustomers && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    {customer.first_name} {customer.last_name}
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.address}</TableCell>
                  <TableCell align="center">{customer.order_count || 0}</TableCell>
                  <TableCell align="right">
                    ${customer.total_spent !== undefined ? customer.total_spent.toFixed(2) : '0.00'}
                  </TableCell>
                  {canManageCustomers && (
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleEditClick(customer)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(customer)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManageCustomers ? 7 : 6} align="center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={customers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Rows per page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
      />
    </Paper>
  );

  const renderCardView = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {filteredCustomers
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((customer) => (
            <Grid item xs={12} sm={6} md={4} key={customer.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {customer.first_name} {customer.last_name}
                    </Typography>
                    {canManageCustomers && (
                      <Box>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditClick(customer)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteClick(customer)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{customer.email}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{customer.phone}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2">{customer.address}</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Chip
                      label={`${customer.order_count} Orders`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="subtitle2">
                      ${customer.total_spent !== undefined ? customer.total_spent.toFixed(2) : '0.00'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        {filteredCustomers.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography>No customers found.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <TablePagination
          rowsPerPageOptions={[6, 12, 24, 48]}
          component="div"
          count={customers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Customers
        </Typography>

        {canManageCustomers && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            New Customer
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search customers"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Tabs value={viewMode} onChange={handleViewModeChange} aria-label="view types">
                <Tab label="Table" value="table" />
                <Tab label="Cards" value="cards" />
              </Tabs>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        viewMode === 'table' ? renderTableView() : renderCardView()
      )}

      <Dialog open={openAddEditDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="first_name"
                label="First Name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="last_name"
                label="Last Name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!currentCustomer}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="phone"
                label="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="state"
                label="State/Province"
                value={formData.state}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="postal_code"
                label="Postal Code"
                value={formData.postal_code}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                margin="dense"
                name="country"
                label="Country"
                value={formData.country}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                name="notes"
                label="Notes"
                multiline
                rows={4}
                value={formData.notes}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCustomer} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this customer? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleDeleteCustomer} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers; 

//const response = await api.get('/customers');
//setCustomers(response.data);
