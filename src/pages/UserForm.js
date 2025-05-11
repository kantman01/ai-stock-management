import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Breadcrumbs,
  Collapse
} from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import api from '../services/api';
import { apiServices } from '../services/api';
import {userService} from '../services/api';

const ROLE_CODES = {
  ADMIN: 'administrator',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  WAREHOUSE: 'warehouse'
};

const mockUsers = [
];

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { user } = useSelector(state => state.auth);
  const canManageUsers = hasPermission(user?.role, PERMISSIONS.MANAGE_USERS);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    isActive: true,
    phone: '',
    position: '',
    department: ''
  });

  
  const [customerData, setCustomerData] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    companyName: '',
    notes: ''
  });

  
  const [supplierData, setSupplierData] = useState({
    name: '', 
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    taxId: '',
    website: '',
    notes: '',
    paymentTerms: ''
  });

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validation, setValidation] = useState({});
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState('');

  
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await apiServices.users.getRoles();
        if (response.roles) {
          
          const filteredRoles = response.roles.filter(role => 
            [ROLE_CODES.ADMIN, ROLE_CODES.CUSTOMER, ROLE_CODES.SUPPLIER, ROLE_CODES.WAREHOUSE].includes(role.code)
          );
          setRoles(filteredRoles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setError('Error loading roles.');
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchUser = async () => {
        setLoading(true);
        try {
          const response = await apiServices.users.getUserById(id);
          
          if (response && response.user) {
            const userData = response.user;
            setFormData({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || '',
              password: '',
              confirmPassword: '',
              roleId: userData.role?.id || '',
              isActive: userData.isActive,
              phone: userData.phone || '',
              position: userData.position || '',
              department: userData.department || ''
            });
            
            setSelectedRoleCode(userData.role?.code || '');
            
            
            if (userData.role?.code === ROLE_CODES.CUSTOMER && userData.customerId) {
              const customerResponse = await api.get(`/customers/${userData.customerId}`);
              if (customerResponse.data) {
                setCustomerData({
                  address: customerResponse.data.address || '',
                  city: customerResponse.data.city || '',
                  state: customerResponse.data.state || '',
                  postalCode: customerResponse.data.postal_code || '',
                  country: customerResponse.data.country || '',
                  companyName: customerResponse.data.company_name || '',
                  notes: customerResponse.data.notes || ''
                });
              }
            }
            
            
            if (userData.role?.code === ROLE_CODES.SUPPLIER && userData.supplierId) {
              const supplierResponse = await api.get(`/suppliers/${userData.supplierId}`);
              if (supplierResponse.data) {
                setSupplierData({
                  name: supplierResponse.data.name || '',
                  address: supplierResponse.data.address || '',
                  city: supplierResponse.data.city || '',
                  state: supplierResponse.data.state || '',
                  postalCode: supplierResponse.data.postal_code || '',
                  country: supplierResponse.data.country || '',
                  taxId: supplierResponse.data.tax_id || '',
                  website: supplierResponse.data.website || '',
                  notes: supplierResponse.data.notes || '',
                  paymentTerms: supplierResponse.data.payment_terms || ''
                });
              }
            }
          } else {
            setError('User not found.');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setError('Error loading user information.');
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (formData.roleId && roles.length > 0) {
      const selectedRole = roles.find(role => role.id === formData.roleId);
      setSelectedRoleCode(selectedRole?.code || '');
    }
  }, [formData.roleId, roles]);

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!isEditMode && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!isEditMode && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.roleId) errors.roleId = 'Role selection is required';

    
    if (selectedRoleCode === ROLE_CODES.CUSTOMER) {
      if (!formData.phone) errors.phone = 'Phone number is required for customers';
      if (!customerData.address) errors.address = 'Address is required for customers';
      if (!customerData.city) errors.city = 'City is required for customers';
      if (!customerData.country) errors.country = 'Country is required for customers';
    }

    
    if (selectedRoleCode === ROLE_CODES.SUPPLIER) {
      if (!supplierData.name) errors.supplierName = 'Company name is required for suppliers';
      if (!formData.phone) errors.phone = 'Phone number is required for suppliers';
      if (!supplierData.address) errors.supplierAddress = 'Address is required for suppliers';
      if (!supplierData.city) errors.supplierCity = 'City is required for suppliers';
      if (!supplierData.country) errors.supplierCountry = 'Country is required for suppliers';
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'isActive' ? checked : value
    });
  };

  const handleCustomerDataChange = (e) => {
    const { name, value } = e.target;
    setCustomerData({
      ...customerData,
      [name]: value
    });
  };

  const handleSupplierDataChange = (e) => {
    const { name, value } = e.target;
    setSupplierData({
      ...supplierData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password || undefined,
        roleId: formData.roleId,
        isActive: formData.isActive,
        phone: formData.phone,
        position: formData.position,
        department: formData.department
      };

      let response;
      
      if (isEditMode) {
        
          response = await userService.updateUser(id, userData);
        
        
        if (selectedRoleCode === ROLE_CODES.CUSTOMER && userData.customerId) {
          await api.put(`/customers/${userData.customerId}`, {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            postal_code: customerData.postalCode,
            country: customerData.country,
            company_name: customerData.companyName,
            notes: customerData.notes,
            is_active: formData.isActive
          });
        } else if (selectedRoleCode === ROLE_CODES.SUPPLIER && userData.supplierId) {
          await api.put(`/suppliers/${userData.supplierId}`, {
            name: supplierData.name,
            contact_name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            address: supplierData.address,
            city: supplierData.city,
            state: supplierData.state,
            postal_code: supplierData.postalCode,
            country: supplierData.country,
            tax_id: supplierData.taxId,
            website: supplierData.website,
            notes: supplierData.notes,
            payment_terms: supplierData.paymentTerms,
            is_active: formData.isActive
          });
        }
        
        setSuccess('User updated successfully.');
      } else {
        
        if (selectedRoleCode === ROLE_CODES.CUSTOMER) {
          
          response = await api.post('/customers', {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            postal_code: customerData.postalCode,
            country: customerData.country,
            company_name: customerData.companyName,
            notes: customerData.notes,
            is_active: formData.isActive
          });
        } else if (selectedRoleCode === ROLE_CODES.SUPPLIER) {
          
          response = await api.post('/suppliers', {
            name: supplierData.name,
            contact_name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            address: supplierData.address,
            city: supplierData.city,
            state: supplierData.state,
            postal_code: supplierData.postalCode,
            country: supplierData.country,
            tax_id: supplierData.taxId,
            website: supplierData.website,
            notes: supplierData.notes,
            payment_terms: supplierData.paymentTerms,
            is_active: formData.isActive
          });
        } else {
          
          response = await userService.createUser(userData);
        }

        setSuccess('User created successfully.');

        
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          roleId: '',
          isActive: true,
          phone: '',
          position: '',
          department: ''
        });
        setCustomerData({
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          companyName: '',
          notes: ''
        });
        setSupplierData({
          name: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          taxId: '',
          website: '',
          notes: '',
          paymentTerms: ''
        });
        setSelectedRoleCode('');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error?.response?.data?.message || (isEditMode ? 'Error updating user.' : 'Error creating user.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  const renderRoleSpecificFields = () => {
    if (selectedRoleCode === ROLE_CODES.CUSTOMER) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Customer Information
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="phone"
              label="Phone Number"
              fullWidth
              required
              value={formData.phone || ''}
              onChange={handleInputChange}
              error={!!validation.phone}
              helperText={validation.phone}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="companyName"
              label="Company Name (Optional)"
              fullWidth
              value={customerData.companyName || ''}
              onChange={handleCustomerDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="address"
              label="Address"
              fullWidth
              required
              value={customerData.address || ''}
              onChange={handleCustomerDataChange}
              error={!!validation.address}
              helperText={validation.address}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="city"
              label="City"
              fullWidth
              required
              value={customerData.city || ''}
              onChange={handleCustomerDataChange}
              error={!!validation.city}
              helperText={validation.city}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="state"
              label="State/Province"
              fullWidth
              value={customerData.state || ''}
              onChange={handleCustomerDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="postalCode"
              label="Postal Code"
              fullWidth
              value={customerData.postalCode || ''}
              onChange={handleCustomerDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="country"
              label="Country"
              fullWidth
              required
              value={customerData.country || ''}
              onChange={handleCustomerDataChange}
              error={!!validation.country}
              helperText={validation.country}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="notes"
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={customerData.notes || ''}
              onChange={handleCustomerDataChange}
              disabled={loading}
            />
          </Grid>
        </Grid>
      );
    } else if (selectedRoleCode === ROLE_CODES.SUPPLIER) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Supplier Information
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="name"
              label="Company Name"
              fullWidth
              required
              value={supplierData.name || ''}
              onChange={handleSupplierDataChange}
              error={!!validation.supplierName}
              helperText={validation.supplierName}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="phone"
              label="Phone Number"
              fullWidth
              required
              value={formData.phone || ''}
              onChange={handleInputChange}
              error={!!validation.phone}
              helperText={validation.phone}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="address"
              label="Address"
              fullWidth
              required
              value={supplierData.address || ''}
              onChange={handleSupplierDataChange}
              error={!!validation.supplierAddress}
              helperText={validation.supplierAddress}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="city"
              label="City"
              fullWidth
              required
              value={supplierData.city || ''}
              onChange={handleSupplierDataChange}
              error={!!validation.supplierCity}
              helperText={validation.supplierCity}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="state"
              label="State/Province"
              fullWidth
              value={supplierData.state || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="postalCode"
              label="Postal Code"
              fullWidth
              value={supplierData.postalCode || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="country"
              label="Country"
              fullWidth
              required
              value={supplierData.country || ''}
              onChange={handleSupplierDataChange}
              error={!!validation.supplierCountry}
              helperText={validation.supplierCountry}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="taxId"
              label="Tax ID"
              fullWidth
              value={supplierData.taxId || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="website"
              label="Website"
              fullWidth
              value={supplierData.website || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="paymentTerms"
              label="Payment Terms"
              fullWidth
              value={supplierData.paymentTerms || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="notes"
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={supplierData.notes || ''}
              onChange={handleSupplierDataChange}
              disabled={loading}
            />
          </Grid>
        </Grid>
      );
    } else if (selectedRoleCode === ROLE_CODES.ADMIN || selectedRoleCode === ROLE_CODES.WAREHOUSE) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Staff Information
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="phone"
              label="Phone Number"
              fullWidth
              value={formData.phone || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="position"
              label="Position"
              fullWidth
              value={formData.position || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="department"
              label="Department"
              fullWidth
              value={formData.department || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
        </Grid>
      );
    }
    
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          Home
        </Link>
        <Link to="/users" style={{ textDecoration: 'none', color: 'inherit' }}>
          Users
        </Link>
        <Typography color="text.primary">
          {isEditMode ? 'Edit User' : 'New User'}
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
          {isEditMode ? 'Edit User' : 'New User'}
        </Typography>

        {loading && !formData.firstName ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : success ? (
          <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="firstName"
                label="First Name"
                fullWidth
                required
                value={formData.firstName}
                onChange={handleInputChange}
                error={!!validation.firstName}
                helperText={validation.firstName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="lastName"
                label="Last Name"
                fullWidth
                required
                value={formData.lastName}
                onChange={handleInputChange}
                error={!!validation.lastName}
                helperText={validation.lastName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={handleInputChange}
                error={!!validation.email}
                helperText={validation.email}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!validation.roleId} disabled={loading || isEditMode}>
                <InputLabel>Role</InputLabel>
                <Select
                  name="roleId"
                  value={formData.roleId}
                  label="Role"
                  onChange={handleInputChange}
                >
                  {loadingRoles ? (
                    <MenuItem disabled>Loading roles...</MenuItem>
                  ) : roles.length > 0 ? (
                    roles.map(role => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No roles found</MenuItem>
                  )}
                </Select>
                {validation.roleId && (
                  <Typography variant="caption" color="error">
                    {validation.roleId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {isEditMode ? 'Change Password (optional)' : 'Password'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="password"
                label="Password"
                type="password"
                fullWidth
                required={!isEditMode}
                value={formData.password}
                onChange={handleInputChange}
                error={!!validation.password}
                helperText={validation.password || 'Must be at least 6 characters'}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                fullWidth
                required={!isEditMode}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={!!validation.confirmPassword}
                helperText={validation.confirmPassword}
                disabled={loading}
              />
            </Grid>

            {/* Role-specific fields */}
            <Grid item xs={12}>
              <Collapse in={!!selectedRoleCode}>
                {renderRoleSpecificFields()}
              </Collapse>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : isEditMode ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default UserForm; 