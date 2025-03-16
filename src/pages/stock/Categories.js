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
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/roles';
import { PERMISSIONS } from '../../utils/roles';
import api from '../../services/api';

const Categories = () => {
  const { user } = useSelector(state => state.auth);
  const canManageCategories = hasPermission(user?.role, PERMISSIONS.MANAGE_CATEGORIES);
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Categories loading error.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddClick = () => {
    setFormData({ name: '', description: '' });
    setOpenAddDialog(true);
  };
  
  const handleEditClick = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
    setOpenEditDialog(true);
  };
  
  const handleDeleteClick = (category) => {
    setCurrentCategory(category);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setCurrentCategory(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleAddCategory = async () => {
    if (!formData.name) {
      setSnackbar({
        open: true,
        message: 'Category name cannot be empty.',
        severity: 'error'
      });
      return;
    }
    
    try {
      const response = await api.categories.create(formData);
      setCategories([...categories, response.data.category]);
      setSnackbar({
        open: true,
        message: 'Category added successfully.',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Category adding error.',
        severity: 'error'
      });
    }
  };
  
  const handleUpdateCategory = async () => {
    if (!formData.name) {
      setSnackbar({
        open: true,
        message: 'Category name cannot be empty.',
        severity: 'error'
      });
      return;
    }
    
    try {
      const response = await api.categories.update(currentCategory.id, formData);
      
      const updatedCategories = categories.map(category => 
        category.id === currentCategory.id ? response.data.category : category
      );
      
      setCategories(updatedCategories);
      setSnackbar({
        open: true,
        message: 'Category updated successfully.',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Category update error.',
        severity: 'error'
      });
    }
  };
  
  const handleDeleteCategory = async () => {
    try {
      await api.categories.delete(currentCategory.id);
      
      const filteredCategories = categories.filter(
        category => category.id !== currentCategory.id
      );
      
      setCategories(filteredCategories);
      setSnackbar({
        open: true,
        message: 'Category deleted successfully.',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Category deletion error.',
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Categories
        </Typography>
        
        {canManageCategories && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            New Category
          </Button>
        )}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Category Name</TableCell>
                <TableCell>Description</TableCell>
                {canManageCategories && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell component="th" scope="row">
                    {category.name}
                  </TableCell>
                  <TableCell>{category.description}</TableCell>
                  {canManageCategories && (
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleEditClick(category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      
      <Dialog open={openAddDialog} onClose={handleCloseDialog}>
        <DialogTitle>New Category Add</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            value={formData.description}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddCategory} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      
      <Dialog open={openEditDialog} onClose={handleCloseDialog}>
        <DialogTitle>Category Edit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            value={formData.description}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpdateCategory} color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
      
      
      <Dialog open={openDeleteDialog} onClose={handleCloseDialog}>
        <DialogTitle>Category Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category "{currentCategory?.name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleDeleteCategory} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Categories; 