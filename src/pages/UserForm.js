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
  Breadcrumbs
} from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/roles';
import { PERMISSIONS } from '../utils/roles';
import api from '../services/api';

const ROLE_OPTIONS = [
];

const mockUsers = [
];

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { user } = useSelector(state => state.auth);
  const canManageUsers = hasPermission(user?.role, PERMISSIONS.MANAGE_USERS);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    isActive: true
  });

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validation, setValidation] = useState({});

  useEffect(() => {

    if (!canManageUsers) {
      navigate('/dashboard');
      return;
    }

    if (isEditMode) {
      const fetchUser = async () => {
        setLoading(true);
        try {



          await new Promise(resolve => setTimeout(resolve, 600));
          const userData = mockUsers.find(u => u.id === parseInt(id));

          if (userData) {
            setFormData({
              name: userData.name,
              username: userData.username,
              email: userData.email,
              password: '',
              confirmPassword: '',
              role: userData.role,
              isActive: userData.isActive
            });
          } else {
            setError('Kullanıcı bulunamadı.');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setError('Kullanıcı bilgileri yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }
  }, [id, isEditMode, canManageUsers, navigate]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name) errors.name = 'Ad Soyad gereklidir';
    if (!formData.username) errors.username = 'Kullanıcı adı gereklidir';

    if (!formData.email) {
      errors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!isEditMode && !formData.password) {
      errors.password = 'Şifre gereklidir';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    if (!isEditMode && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    if (!formData.role) errors.role = 'Rol seçimi gereklidir';

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditMode) {






        await new Promise(resolve => setTimeout(resolve, 800));

        setSuccess('Kullanıcı başarıyla güncellendi.');
      } else {






        await new Promise(resolve => setTimeout(resolve, 800));

        setSuccess('Kullanıcı başarıyla oluşturuldu.');

        if (!isEditMode) {
          setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'customer',
            isActive: true
          });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError(isEditMode
        ? 'Kullanıcı güncellenirken bir hata oluştu.'
        : 'Kullanıcı oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          Ana Sayfa
        </Link>
        <Link to="/users" style={{ textDecoration: 'none', color: 'inherit' }}>
          Kullanıcılar
        </Link>
        <Typography color="text.primary">
          {isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
          {isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
        </Typography>

        {loading && !formData.name ? (
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
                name="name"
                label="Ad Soyad"
                fullWidth
                required
                value={formData.name}
                onChange={handleInputChange}
                error={!!validation.name}
                helperText={validation.name}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="username"
                label="Kullanıcı Adı"
                fullWidth
                required
                value={formData.username}
                onChange={handleInputChange}
                error={!!validation.username}
                helperText={validation.username}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="E-posta"
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
              <FormControl fullWidth required>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Rol"
                  onChange={handleInputChange}
                  error={!!validation.role}
                  disabled={loading}
                >
                  {ROLE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {isEditMode ? 'Şifre Değiştir (opsiyonel)' : 'Şifre'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="password"
                label="Şifre"
                type="password"
                fullWidth
                required={!isEditMode}
                value={formData.password}
                onChange={handleInputChange}
                error={!!validation.password}
                helperText={validation.password}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="confirmPassword"
                label="Şifre Tekrar"
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
                label="Aktif"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  İptal
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
                    'Güncelle'
                  ) : (
                    'Oluştur'
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