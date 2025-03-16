const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const { 
  createOrderValidation, 
  updateOrderStatusValidation
} = require('../utils/validators');


router.get('/', authenticateJWT, orderController.getOrders);


router.get('/:id', authenticateJWT, orderController.getOrderById);


router.post(
  '/', 
  authenticateJWT, 
  checkPermission('CREATE_ORDERS'), 
  createOrderValidation, 
  orderController.createOrder
);


router.patch(
  '/:id/status', 
  authenticateJWT, 
  checkPermission('MANAGE_ORDERS'), 
  updateOrderStatusValidation, 
  orderController.updateOrderStatus
);


router.delete(
  '/:id', 
  authenticateJWT, 
  checkPermission('MANAGE_ORDERS'), 
  orderController.deleteOrder
);

module.exports = router; 