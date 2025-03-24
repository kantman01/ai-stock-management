const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const {
  createCustomerValidation,
  updateCustomerValidation
} = require('../utils/validators');

router.get('/', authenticateJWT, customerController.getCustomers);

router.get('/:id', authenticateJWT, customerController.getCustomerById);

router.get('/:id/orders', authenticateJWT, customerController.getCustomerOrders);

router.post(
  '/',
  authenticateJWT,
  checkPermission('MANAGE_CUSTOMERS'),
  createCustomerValidation,
  customerController.createCustomer
);

router.put(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_CUSTOMERS'),
  updateCustomerValidation,
  customerController.updateCustomer
);

router.delete(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_CUSTOMERS'),
  customerController.deleteCustomer
);

module.exports = router; 