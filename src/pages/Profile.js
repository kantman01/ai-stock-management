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
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon,
  Check as CheckIcon,
  Login as LoginIcon,
  Devices as DevicesIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';

const Profile = () => {
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    browserNotifications: false,
    orderUpdates: true,
    stockAlerts: true,
    securityAlerts: true,
    marketingEmails: false
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
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        bio: user.bio || ''
      });
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationPreferences({
      ...notificationPreferences,
      [name]: checked
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
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

  const handleSavePassword = () => {

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    setTimeout(() => {
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
    }, 1000);
  };

  const handleSaveNotifications = () => {
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
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={avatarPreview || (user?.avatar || '')}
              sx={{ width: 100, height: 100 }}
            >
              {profileData.name.charAt(0)}
            </Avatar>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="avatar-upload"
              type="file"
              onChange={handleAvatarChange}
            />
            <label htmlFor="avatar-upload">
              <Button
                component="span"
                startIcon={<EditIcon />}
                size="small"
                sx={{ mt: 1 }}
              >
                Change
              </Button>
            </label>
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1" fontWeight="bold">
              {profileData.name || 'User Name'}
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
          <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
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
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Name"
                fullWidth
                value={profileData.name}
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

      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="emailNotifications"
                    checked={notificationPreferences.emailNotifications}
                    onChange={handleNotificationChange}
                  />
                }
                label="Email Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="browserNotifications"
                    checked={notificationPreferences.browserNotifications}
                    onChange={handleNotificationChange}
                  />
                }
                label="Browser Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Notification Types
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="orderUpdates"
                    checked={notificationPreferences.orderUpdates}
                    onChange={handleNotificationChange}
                  />
                }
                label="Order Updates"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="stockAlerts"
                    checked={notificationPreferences.stockAlerts}
                    onChange={handleNotificationChange}
                  />
                }
                label="Stock Alerts"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="securityAlerts"
                    checked={notificationPreferences.securityAlerts}
                    onChange={handleNotificationChange}
                  />
                }
                label="Security Alerts"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="marketingEmails"
                    checked={notificationPreferences.marketingEmails}
                    onChange={handleNotificationChange}
                  />
                }
                label="Marketing Emails"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveNotifications}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save'}
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