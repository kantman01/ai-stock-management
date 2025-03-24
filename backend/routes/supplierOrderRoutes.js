const express = require('express');
const router = express.Router();
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const supplierOrderController = require('../controllers/supplierOrderController');

/**
 * @route GET /api/supplier-orders
 * @desc Get all supplier orders
 * @access Private  
 */
router.get('/', authenticateJWT, supplierOrderController.getSupplierOrders);

/**
 * @route GET /api/supplier-orders/:id
 * @desc Get supplier order by ID
 * @access Private
 */
router.get('/:id', authenticateJWT, supplierOrderController.getSupplierOrderById);

/**
 * @route POST /api/supplier-orders
 * @desc Create a new supplier order
 * @access Private
 */
router.post('/', authenticateJWT, supplierOrderController.createSupplierOrder);

/**
 * @route PATCH /api/supplier-orders/:id/status
 * @desc Update supplier order status
 * @access Private
 */
router.patch('/:id/status', authenticateJWT, supplierOrderController.updateSupplierOrderStatus);

/**
 * @route DELETE /api/supplier-orders/:id
 * @desc Cancel a supplier order
 * @access Private
 */
router.delete('/:id', authenticateJWT, supplierOrderController.deleteSupplierOrder);

/**
 * @route PATCH /api/supplier-orders/:id/complete
 * @desc Complete a supplier order (add items to inventory)
 * @access Private
 */
router.patch('/:id/complete', authenticateJWT, supplierOrderController.completeSupplierOrder);

module.exports = router; 