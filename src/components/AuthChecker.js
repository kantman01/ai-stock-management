import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getCurrentUser, selectIsLoading } from '../redux/features/authSlice';
import { CircularProgress, Box } from '@mui/material'; // Yükleniyor animasyonu için Material UI bileşenleri


/**
 * Uygulama başlatıldığında kullanıcının kimlik doğrulama durumunu kontrol eden bileşen.
 * localStorage'da bir token varsa, kullanıcı bilgilerini getirir.
 * Login, register gibi public sayfalarda loading göstermez.
 */
const AuthChecker = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isLoading = useSelector(selectIsLoading);

  const publicRoutes = ['/login', '/register', '/unauthorized'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    const token = localStorage.getItem('token'); // Tarayıcıda token var mı?
    if (token) {
      dispatch(getCurrentUser()); // Kullanıcı bilgilerini Redux'a çek
    }
  }, [dispatch]);

  
  if (!isPublicRoute && isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return children;
};

export default AuthChecker; 