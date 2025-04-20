const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const {
  createUserValidation,
  updateUserValidation
} = require('../utils/validators');

router.get('/', authenticateJWT, checkPermission('VIEW_USERS'), userController.getUsers);

router.get('/roles', authenticateJWT, userController.getRoles);

router.get('/:id', authenticateJWT, checkPermission('VIEW_USERS'), userController.getUserById);

router.post('/', authenticateJWT, checkPermission('MANAGE_USERS'), createUserValidation, userController.createUser);

router.put('/:id', authenticateJWT, updateUserValidation, userController.updateUser);

router.delete('/:id', authenticateJWT, checkPermission('MANAGE_USERS'), userController.deleteUser);

router.get('/:id/permissions', userController.getUserPermissions);

module.exports = router; 