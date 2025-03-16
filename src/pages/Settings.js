import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Grid,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  Language as LanguageIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';

const Settings = () => {
  const { user } = useSelector(state => state.auth);
  const canManageSettings = hasPermission(user?.role?.code, PERMISSIONS.MANAGE_SETTINGS);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'AI Stock Management System',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '24',
    timezone: 'Europe/London',
    currency: 'USD'
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    orderStatusUpdates: true,
    securityAlerts: true,
    marketingEmails: false,
    stockMovementAlerts: true
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    loginAttempts: '5'
  });
  
  const handleGeneralSettingsChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: value
    });
  };
  
  const handleNotificationSettingsChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings({
      ...notificationSettings,
      [name]: checked
    });
  };
  
  const handleSecuritySettingsChange = (e) => {
    const { name, value, checked, type } = e.target;
    setSecuritySettings({
      ...securitySettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSaveSettings = () => {
    if (!canManageSettings) {
      setError('You do not have permission to change settings.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }, 1000);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        System Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckIcon />}>
          Settings saved successfully.
        </Alert>
      )}
      
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              name="companyName"
              label="Company Name"
              fullWidth
              value={generalSettings.companyName}
              onChange={handleGeneralSettingsChange}
              disabled={!canManageSettings}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                name="language"
                value={generalSettings.language}
                label="Language"
                onChange={handleGeneralSettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="tr">Turkish</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="fr">French</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                name="dateFormat"
                value={generalSettings.dateFormat}
                label="Date Format"
                onChange={handleGeneralSettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="DD.MM.YYYY">DD.MM.YYYY</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Time Format</InputLabel>
              <Select
                name="timeFormat"
                value={generalSettings.timeFormat}
                label="Time Format"
                onChange={handleGeneralSettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="24">24 Hour (14:30)</MenuItem>
                <MenuItem value="12">12 Hour (2:30 PM)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Timezone</InputLabel>
              <Select
                name="timezone"
                value={generalSettings.timezone}
                label="Timezone"
                onChange={handleGeneralSettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="Europe/London">Europe/London (GMT+0)</MenuItem>
                <MenuItem value="Europe/Istanbul">Europe/Istanbul (GMT+3)</MenuItem>
                <MenuItem value="America/New_York">America/New_York (GMT-5)</MenuItem>
                <MenuItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                name="currency"
                value={generalSettings.currency}
                label="Currency"
                onChange={handleGeneralSettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="USD">US Dollar ($)</MenuItem>
                <MenuItem value="EUR">Euro (€)</MenuItem>
                <MenuItem value="GBP">British Pound (£)</MenuItem>
                <MenuItem value="TRY">Turkish Lira (₺)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                name="emailNotifications"
                checked={notificationSettings.emailNotifications}
                onChange={handleNotificationSettingsChange}
                disabled={!canManageSettings}
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                name="lowStockAlerts"
                checked={notificationSettings.lowStockAlerts}
                onChange={handleNotificationSettingsChange}
                disabled={!canManageSettings}
              />
            }
            label="Low Stock Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                name="orderStatusUpdates"
                checked={notificationSettings.orderStatusUpdates}
                onChange={handleNotificationSettingsChange}
                disabled={!canManageSettings}
              />
            }
            label="Order Status Updates"
          />
          <FormControlLabel
            control={
              <Switch
                name="securityAlerts"
                checked={notificationSettings.securityAlerts}
                onChange={handleNotificationSettingsChange}
                disabled={!canManageSettings}
              />
            }
            label="Security Alerts"
          />
        </FormGroup>
      </Paper>
      
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Security Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="twoFactorAuth"
                  checked={securitySettings.twoFactorAuth}
                  onChange={handleSecuritySettingsChange}
                  disabled={!canManageSettings}
                />
              }
              label="Two-Factor Authentication (2FA)"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Session Timeout (minutes)</InputLabel>
              <Select
                name="sessionTimeout"
                value={securitySettings.sessionTimeout}
                label="Session Timeout (minutes)"
                onChange={handleSecuritySettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="15">15 minutes</MenuItem>
                <MenuItem value="30">30 minutes</MenuItem>
                <MenuItem value="60">1 hour</MenuItem>
                <MenuItem value="120">2 hours</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Password Expiry (days)</InputLabel>
              <Select
                name="passwordExpiry"
                value={securitySettings.passwordExpiry}
                label="Password Expiry (days)"
                onChange={handleSecuritySettingsChange}
                disabled={!canManageSettings}
              >
                <MenuItem value="30">30 days</MenuItem>
                <MenuItem value="60">60 days</MenuItem>
                <MenuItem value="90">90 days</MenuItem>
                <MenuItem value="180">180 days</MenuItem>
                <MenuItem value="never">Never</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {canManageSettings && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save All Settings'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Settings; 