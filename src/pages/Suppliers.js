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
  List,
  ListItem,
  ListItemText,
  Switch,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Link as LinkIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import GridViewIcon from '@mui/icons-material/GridView';
import TableViewIcon from '@mui/icons-material/TableView';
import api, { apiServices } from '../services/api';

const mockSuppliers = [
  {
    id: 1,
    name: 'Tech Solutions Inc.',
    contact_name: 'John Williams',
    email: 'jwilliams@techsolutions.com',
    phone: '+1 (555) 123-4567',
    address: '1234 Tech Blvd, San Francisco, CA',
    website: 'www.techsolutions.com',
    is_active: true,
    order_count: 12,
    total_ordered: 25800.75,
    created_at: '2023-01-15T10:30:00'
  },
  {
    id: 2,
    name: 'Global Electronics',
    contact_name: 'Emily Chen',
    email: 'emily.chen@globalelectronics.com',
    phone: '+1 (555) 234-5678',
    address: '5678 Industry Way, Austin, TX',
    website: 'www.globalelectronics.com',
    is_active: true,
    order_count: 8,
    total_ordered: 17450.50,
    created_at: '2023-02-22T14:45:00'
  },
  {
    id: 3,
    name: 'Prime Components Ltd.',
    contact_name: 'Robert Johnson',
    email: 'robert@primecomponents.com',
    phone: '+1 (555) 345-6789',
    address: '9012 Assembly Row, Chicago, IL',
    website: 'www.primecomponents.com',
    is_active: true,
    order_count: 5,
    total_ordered: 9200.25,
    created_at: '2023-03-10T09:15:00'
  },
  {
    id: 4,
    name: 'Innovative Supplies Co.',
    contact_name: 'Lisa Brown',
    email: 'lisa@innovativesupplies.com',
    phone: '+1 (555) 456-7890',
    address: '3456 Innovation Dr, Boston, MA',
    website: 'www.innovativesupplies.com',
    is_active: false,
    order_count: 3,
    total_ordered: 5600.00,
    created_at: '2023-01-05T16:20:00'
  },
  {
    id: 5,
    name: 'Quality Hardware Distributors',
    contact_name: 'Michael Smith',
    email: 'michael@qualityhardware.com',
    phone: '+1 (555) 567-8901',
    address: '7890 Quality Ave, Seattle, WA',
    website: 'www.qualityhardware.com',
    is_active: true,
    order_count: 7,
    total_ordered: 12750.75,
    created_at: '2023-04-18T11:30:00'
  }
];

const Suppliers = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState('add');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState({
    name: '',
    contact_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    tax_id: '',
    website: '',
    notes: '',
    payment_terms: '',
    is_active: true
  });

  const { user } = useSelector(state => state.auth);
  const canManageSuppliers = hasPermission(user, PERMISSIONS.MANAGE_SUPPLIERS);

  useEffect(() => {
    fetchSuppliers();
  }, [page, rowsPerPage, searchTerm]);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: searchTerm || undefined
      };

      const response = await apiServices.suppliers.getAll(params);
      setSuppliers(response.data.data || []);
      setTotalCount(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to load suppliers. Please try again.');
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleAddClick = () => {
    setDialogAction('add');
    setCurrentSupplier({
      name: '',
      contact_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      tax_id: '',
      website: '',
      notes: '',
      payment_terms: '',
      is_active: true
    });
    setOpenDialog(true);
  };

  const handleEditClick = (supplier) => {
    setDialogAction('edit');
    setCurrentSupplier({
      id: supplier.id,
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      postal_code: supplier.postal_code || '',
      country: supplier.country || '',
      tax_id: supplier.tax_id || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      payment_terms: supplier.payment_terms || '',
      is_active: supplier.is_active
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = (supplier) => {
    setCurrentSupplier(supplier);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDeleteConfirmOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentSupplier(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (e) => {
    setCurrentSupplier(prev => ({
      ...prev,
      is_active: e.target.checked
    }));
  };

  const validateForm = () => {
    let errorMessages = [];
    
    if (!currentSupplier.name) {
      errorMessages.push('Supplier name is required.');
    }
    
    if (currentSupplier.email && !/\S+@\S+\.\S+/.test(currentSupplier.email)) {
      errorMessages.push('Email format is invalid.');
    }
    
    if (dialogAction === 'add' && !currentSupplier.password) {
      errorMessages.push('Password is required for new supplier account.');
    } else if (currentSupplier.password && currentSupplier.password.length < 8) {
      errorMessages.push('Password must be at least 8 characters.');
    }
    
    if (errorMessages.length > 0) {
      setError(errorMessages.join(' '));
      return false;
    }
    
    return true;
  };

  const handleSaveSupplier = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (dialogAction === 'add') {

        const response = await apiServices.suppliers.create(currentSupplier);

        const newSupplier = response.data;
        setSuppliers([...suppliers, newSupplier]);

      } else {

        const { id, ...supplierData } = currentSupplier;
        const response = await apiServices.suppliers.update(id, supplierData);

        const updatedSupplier = response.data;
        setSuppliers(suppliers.map(s =>
          s.id === currentSupplier.id ? updatedSupplier : s
        ));
      }

      setOpenDialog(false);

      fetchSuppliers();
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier: ' + (err.response?.data?.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setLoading(true);
    setError(null);

    try {

      await apiServices.suppliers.delete(currentSupplier.id);

      setSuppliers(suppliers.filter(s => s.id !== currentSupplier.id));

      setDeleteConfirmOpen(false);

      fetchSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier: ' + (err.response?.data?.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers;

  const paginatedSuppliers = filteredSuppliers;

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Contact Information</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Orders</TableCell>
            <TableCell>Total Ordered</TableCell>
            <TableCell>Date Added</TableCell>
            {canManageSuppliers && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedSuppliers.map((supplier) => (
            <TableRow key={supplier.id} hover>
              <TableCell>{supplier.id}</TableCell>
              <TableCell>
                <Typography variant="subtitle2">{supplier.name}</Typography>
                {supplier.contact_name && (
                  <Typography variant="body2" color="text.secondary">
                    Contact: {supplier.contact_name}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box>
                  {supplier.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      {supplier.email}
                    </Box>
                  )}
                  {supplier.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      {supplier.phone}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={supplier.is_active ? "Active" : "Inactive"}
                  color={supplier.is_active ? "success" : "default"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {supplier.order_count}
              </TableCell>
              <TableCell>
                ${supplier.total_ordered?.toFixed(2)}
              </TableCell>
              <TableCell>
                {new Date(supplier.created_at).toLocaleDateString()}
              </TableCell>
              {canManageSuppliers && (
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleEditClick(supplier)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(supplier)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  const renderCardView = () => (
    <Grid container spacing={2}>
      {paginatedSuppliers.map((supplier) => (
        <Grid item xs={12} sm={6} md={4} key={supplier.id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '&:hover': { boxShadow: 6 }
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" component="div">
                  {supplier.name}
                  <Chip
                    label={supplier.is_active ? "Active" : "Inactive"}
                    color={supplier.is_active ? "success" : "default"}
                    size="small"
                    sx={{ ml: 1, verticalAlign: 'middle' }}
                  />
                </Typography>
                {canManageSuppliers && (
                  <Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditClick(supplier)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(supplier)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {supplier.contact_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Contact: {supplier.contact_name}
                </Typography>
              )}

              <Box sx={{ mb: 2 }}>
                {supplier.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">{supplier.email}</Typography>
                  </Box>
                )}
                {supplier.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">{supplier.phone}</Typography>
                  </Box>
                )}
                {supplier.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">{supplier.address}</Typography>
                  </Box>
                )}
                {supplier.website && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinkIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">{supplier.website}</Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Chip
                  label={`${supplier.order_count} Orders`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body2">
                  <strong>Total:</strong> ${supplier.total_ordered?.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
        <TablePagination
          rowsPerPageOptions={[6, 12, 24, 48]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Supplier Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your suppliers, view order history, and contact information.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Search suppliers..."
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
          <Grid item xs={12} sm={6} md={4}>
            <Tabs
              value={viewMode}
              onChange={handleViewModeChange}
              variant="fullWidth"
            >
              <Tab icon={<TableViewIcon />} label="Table" value="table" />
              <Tab icon={<GridViewIcon />} label="Cards" value="cards" />
            </Tabs>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {canManageSuppliers && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
              >
                Add Supplier
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && filteredSuppliers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No suppliers found.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchTerm ? 'Try changing your search criteria.' : 'Add a new supplier to get started.'}
          </Typography>
        </Paper>
      ) : (
        !loading && viewMode === 'table' ? renderTableView() : renderCardView()
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogAction === 'add' ? 'Add New Supplier' : 'Edit Supplier'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Supplier Name"
                name="name"
                value={currentSupplier.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Name"
                name="contact_name"
                value={currentSupplier.contact_name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={currentSupplier.email}
                onChange={handleInputChange}
                type="email"
                required={dialogAction === 'add'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={dialogAction === 'add' ? "Password*" : "Password (Leave blank to keep current)"}
                name="password"
                value={currentSupplier.password}
                onChange={handleInputChange}
                type="password"
                required={dialogAction === 'add'}
                helperText={dialogAction === 'edit' && "Only enter a password if you want to change it."}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={currentSupplier.phone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Website"
                name="website"
                value={currentSupplier.website}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={currentSupplier.address}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={currentSupplier.city}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State/Province"
                name="state"
                value={currentSupplier.state}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                name="postal_code"
                value={currentSupplier.postal_code}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={currentSupplier.country}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tax ID / VAT Number"
                name="tax_id"
                value={currentSupplier.tax_id}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Terms"
                name="payment_terms"
                value={currentSupplier.payment_terms}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={currentSupplier.notes}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 2 }}>
                  Status:
                </Typography>
                <Switch
                  checked={currentSupplier.is_active}
                  onChange={handleSwitchChange}
                  color="primary"
                />
                <Typography variant="body1">
                  {currentSupplier.is_active ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveSupplier}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleCloseDialog}>
        <DialogTitle>Delete Supplier</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {currentSupplier.name}?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteSupplier}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Suppliers; 