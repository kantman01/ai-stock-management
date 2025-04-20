import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Button,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Login as LoginIcon,
  Devices as DevicesIcon,
  Check as CheckIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import api, { userService } from '../services/api';
import { updateCurrentUser } from '../redux/features/authSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    bio: ''
  });

  const [supplierData, setSupplierData] = useState({
    supplierName: '',
    address: '',
    city: '',
    country: '',
    state: '',
    postalCode: '',
    website: '',
    taxId: '',
    paymentTerms: '',
    notes: ''
  });

  const [customerData, setCustomerData] = useState({
    address: '',
    city: '',
    country: '',
    state: '',
    postalCode: '',
    companyName: '',
    notes: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loginHistory] = useState([
    { id: 1, date: '2023-05-15T10:30:00', ip: '192.168.1.1', device: 'Chrome / Windows', status: 'success' },
    { id: 2, date: '2023-05-14T08:45:00', ip: '192.168.1.1', device: 'Chrome / Windows', status: 'success' },
    { id: 3, date: '2023-05-13T14:20:00', ip: '192.168.1.10', device: 'Safari / iOS', status: 'success' },
    { id: 4, date: '2023-05-12T09:15:00', ip: '10.0.0.5', device: 'Firefox / MacOS', status: 'success' },
    { id: 5, date: '2023-05-10T16:50:00', ip: '8.8.8.8', device: 'Unknown', status: 'failed' }
  ]);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || (user.supplier?.phone || user.customer?.phone || ''),
        position: user.position || '',
        department: user.department || '',
        bio: user.bio || ''
      });

      
      if (user.supplier) {
        setSupplierData({
          supplierName: user.supplier.name || '',
          address: user.supplier.address || '',
          city: user.supplier.city || '',
          country: user.supplier.country || '',
          state: user.supplier.state || '',
          postalCode: user.supplier.postal_code || '',
          website: user.supplier.website || '',
          taxId: user.supplier.tax_id || '',
          paymentTerms: user.supplier.payment_terms || '',
          notes: user.supplier.notes || ''
        });
      }

      
      if (user.customer) {
        setCustomerData({
          address: user.customer.address || '',
          city: user.customer.city || '',
          country: user.customer.country || '',
          state: user.customer.state || '',
          postalCode: user.customer.postal_code || '',
          companyName: user.customer.company_name || '',
          notes: user.customer.notes || ''
        });
      }
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  const handleSupplierChange = (e) => {
    const { name, value } = e.target;
    setSupplierData({
      ...supplierData,
      [name]: value
    });
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerData({
      ...customerData,
      [name]: value
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };


  const handleSaveProfile = () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    let updateData = {};
    updateData = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      position: profileData.position,
      department: profileData.department,
      bio: profileData.bio
    };

    
    if (user.supplier) {
      updateData = {
        ...updateData,
        supplierName: supplierData.supplierName,
        address: supplierData.address,
        city: supplierData.city,
        country: supplierData.country,
        state: supplierData.state,
        postalCode: supplierData.postalCode,
        website: supplierData.website,
        taxId: supplierData.taxId,
        paymentTerms: supplierData.paymentTerms,
        notes: supplierData.notes
      };
    }

    
    if (user.customer) {
      updateData = {
        ...updateData,
        address: customerData.address,
        city: customerData.city,
        country: customerData.country,
        state: customerData.state,
        postalCode: customerData.postalCode,
        companyName: customerData.companyName,
        notes: customerData.notes
      };
    }

    userService.updateProfile(updateData)
      .then(response => {
        setLoading(false);
        setSuccess(true);
        
        
        if (response.user) {
          
          dispatch(updateCurrentUser(response.user));
          
          
          const updatedUser = response.user;
          setProfileData({
            firstName: updatedUser.firstName || '',
            lastName: updatedUser.lastName || '',
            email: updatedUser.email || '',
            phone: updatedUser.phone || '',
            position: updatedUser.position || '',
            department: updatedUser.department || '',
            bio: updatedUser.bio || ''
          });

          console.log("response.user",response.user)
          console.log("updatedUser",updatedUser)

          
          if (updatedUser.supplier) {
            setSupplierData({
              supplierName: updatedUser.supplier.name || '',
              address: updatedUser.supplier.address || '',
              city: updatedUser.supplier.city || '',
              country: updatedUser.supplier.country || '',
              state: updatedUser.supplier.state || '',
              postalCode: updatedUser.supplier.postalCode || '',
              website: updatedUser.supplier.website || '',
              taxId: updatedUser.supplier.taxId || '',
              paymentTerms: updatedUser.supplier.paymentTerms || '',
              notes: updatedUser.supplier.notes || ''
            });
          }

          
          if (updatedUser.customer) {
            setCustomerData({
              address: updatedUser.customer.address || '',
              city: updatedUser.customer.city || '',
              country: updatedUser.customer.country || '',
              state: updatedUser.customer.state || '',
              postalCode: updatedUser.customer.postalCode || '',
              companyName: updatedUser.customer.companyName || '',
              notes: updatedUser.customer.notes || ''
            });
          }
        }

        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      })
      .catch(err => {
        setLoading(false);
        setError(err.response?.data?.message || 'An error occurred while updating your profile.');
        console.error('Error updating profile:', err);
      });
  };

  const handleSavePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    api.post('/auth/change-password', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    })
      .then(response => {
        setLoading(false);
        setSuccess(true);

        
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      })
      .catch(err => {
        setLoading(false);
        setError(err.response?.data?.message || 'An error occurred while changing your password.');
        console.error('Error changing password:', err);
      });
  };

  const renderSupplierDetails = () => {
    if (!user || !user.supplier) return null;
    
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Supplier Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              name="supplierName"
              label="Company Name"
              fullWidth
              value={supplierData.supplierName}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="address"
              label="Address"
              fullWidth
              value={supplierData.address}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="city"
              label="City"
              fullWidth
              value={supplierData.city}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="state"
              label="State/Province"
              fullWidth
              value={supplierData.state}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="postalCode"
              label="Postal Code"
              fullWidth
              value={supplierData.postalCode}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="country"
              label="Country"
              fullWidth
              value={supplierData.country}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="website"
              label="Website"
              fullWidth
              value={supplierData.website}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="taxId"
              label="Tax ID"
              fullWidth
              value={supplierData.taxId}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="paymentTerms"
              label="Payment Terms"
              fullWidth
              value={supplierData.paymentTerms}
              onChange={handleSupplierChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="notes"
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={supplierData.notes}
              onChange={handleSupplierChange}
            />
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderCustomerDetails = () => {
    if (!user || !user.customer) return null;
    
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Customer Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              name="companyName"
              label="Company Name"
              fullWidth
              value={customerData.companyName}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="address"
              label="Address"
              fullWidth
              value={customerData.address}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="city"
              label="City"
              fullWidth
              value={customerData.city}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="state"
              label="State/Province"
              fullWidth
              value={customerData.state}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="postalCode"
              label="Postal Code"
              fullWidth
              value={customerData.postalCode}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="country"
              label="Country"
              fullWidth
              value={customerData.country}
              onChange={handleCustomerChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="notes"
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={customerData.notes}
              onChange={handleCustomerChange}
            />
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={avatarPreview || (user?.avatar || '')}
              sx={{ width: 100, height: 100 }}
            >
              {profileData.firstName ? profileData.firstName.charAt(0) : ''}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1" fontWeight="bold">
              {profileData.firstName && profileData.lastName 
                ? `${profileData.firstName} ${profileData.lastName}` 
                : 'User Name'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profileData.email || 'email@example.com'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {profileData.position && profileData.department
                ? `${profileData.position}, ${profileData.department}`
                : 'Position, Department'}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={user?.role?.code ? user.role.code.charAt(0).toUpperCase() + user.role.code.slice(1) : 'User'}
                color="primary"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Profile" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Password" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Login History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckIcon />}>
          Your information has been updated successfully.
        </Alert>
      )}

      {activeTab === 0 && (
        <>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="firstName"
                  label="First Name"
                  fullWidth
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="lastName"
                  label="Last Name"
                  fullWidth
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  value={profileData.email}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="phone"
                  label="Phone"
                  fullWidth
                  value={profileData.phone}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="position"
                  label="Position"
                  fullWidth
                  value={profileData.position}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="department"
                  label="Department"
                  fullWidth
                  value={profileData.department}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="bio"
                  label="About Me"
                  multiline
                  rows={4}
                  fullWidth
                  value={profileData.bio}
                  onChange={handleProfileChange}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </Box>
          </Paper>
          
          {/* Render supplier or customer details if they exist */}
          {renderSupplierDetails()}
          {renderCustomerDetails()}
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="currentPassword"
                label="Current Password"
                type="password"
                fullWidth
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="newPassword"
                label="New Password"
                type="password"
                fullWidth
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                helperText="Must be at least 6 characters"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="confirmPassword"
                label="New Password (Confirm)"
                type="password"
                fullWidth
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
                helperText={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== '' ? 'Passwords do not match' : ''}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSavePassword}
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {loading ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </Box>
        </Paper>
      )}


      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Login History
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <List>
            {loginHistory.map((login) => (
              <ListItem key={login.id} disablePadding sx={{ mb: 2 }}>
                <Card variant="outlined" sx={{ width: '100%' }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <ListItemIcon>
                          {login.status === 'success' ? (
                            <LoginIcon color="success" />
                          ) : (
                            <LoginIcon color="error" />
                          )}
                        </ListItemIcon>
                      </Grid>
                      <Grid item xs>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">
                                {new Date(login.date).toLocaleString('en-US')}
                              </Typography>
                              <Chip
                                label={login.status === 'success' ? 'Success' : 'Failed'}
                                color={login.status === 'success' ? 'success' : 'error'}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" component="span" color="text.secondary">
                                <DevicesIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {login.device}
                              </Typography>
                              <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 2 }}>
                                IP: {login.ip}
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default Profile; 