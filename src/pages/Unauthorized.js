import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

/**
 * Displayed when a user attempts to access a resource they don't have permission for
 */
const Unauthorized = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <BlockIcon
            color="error"
            sx={{ fontSize: 80, mb: 2 }}
          />

          <Typography component="h1" variant="h3" gutterBottom>
            Access Denied
          </Typography>

          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            You don't have permission to view this page.
            If you think you should have access, please contact the system administrator.
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="primary"
              component={Link}
              to="/login"
              startIcon={<HomeIcon />}
            >
              Back to Home
            </Button>

            <Button
              variant="contained"
              color="primary"
              onClick={() => window.history.back()}
              startIcon={<ArrowBackIcon />}
            >
              Back to Previous Page
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized; 