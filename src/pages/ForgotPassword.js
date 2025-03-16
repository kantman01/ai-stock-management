import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Container,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  KeyboardBackspace as BackIcon,
  LockOutlined,
  Email as EmailIcon
} from '@mui/icons-material';
import { authService } from '../services/api';

const ForgotPassword = () => {
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setValidationError('');
    setError('');
  };

  
  const validateForm = () => {
    if (!email) {
      setValidationError('E-posta adresi gereklidir.');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Geçerli bir e-posta adresi giriniz.');
      return false;
    }
    
    return true;
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      
      const response = await authService.forgotPassword(email);
      setSuccess(response.message || 'Şifre sıfırlama bağlantısı e-posta adresinize gönderilmiştir.');
      setEmail(''); 
    } catch (err) {
      setError(err.message || 'Şifre sıfırlama isteği gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <LockOutlined />
          </Box>
          
          <Typography component="h1" variant="h5" fontWeight="bold" gutterBottom>
            Şifre Sıfırlama
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Kayıtlı e-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-posta Adresi"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={handleEmailChange}
              error={!!validationError}
              helperText={validationError}
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <EmailIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Şifre Sıfırlama Bağlantısı Gönder'}
            </Button>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                component={Link}
                to="/login"
                startIcon={<BackIcon />}
                sx={{ textTransform: 'none' }}
              >
                Giriş Sayfasına Dön
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword; 