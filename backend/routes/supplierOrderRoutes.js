const express = require('express');
const router = express.Router();
const supplierOrderController = require('../controllers/supplierOrderController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');


const logRequest = (req, res, next) => {
  console.log(`[DEBUG API] ${req.method} ${req.originalUrl} called with:`, {
    params: req.params,
    query: req.query,
    body: req.body,
    user: req.user ? { id: req.user.id, role: req.user.role } : 'No user'
  });
  next();
};

/**
 * @route   GET /api/supplier-orders
 * @desc    Get all supplier orders with filtering
 * @access  Private (requires authentication)
 */
router.get('/', authenticateJWT, supplierOrderController.getSupplierOrders);

/**
 * @route   GET /api/supplier-orders/:id
 * @desc    Get a single supplier order by ID
 * @access  Private (requires authentication)
 */
router.get('/:id', authenticateJWT, supplierOrderController.getSupplierOrderById);

/**
 * @route   POST /api/supplier-orders
 * @desc    Create a new supplier order
 * @access  Private (requires MANAGE_INVENTORY permission)
 */
router.post(
  '/',
  authenticateJWT,
  checkPermission('MANAGE_INVENTORY'),
  supplierOrderController.createSupplierOrder
);

/**
 * @route   PUT /api/supplier-orders/:id/status
 * @desc    Update the status of a supplier order
 * @access  Private (requires authentication - both suppliers and staff)
 */
router.put(
  '/:id/status',
  authenticateJWT,
  supplierOrderController.updateSupplierOrderStatus
);


/**
 * @route   DELETE /api/supplier-orders/:id
 * @desc    Delete a supplier order
 * @access  Private (requires MANAGE_INVENTORY permission)
 */
router.delete(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_INVENTORY'),
  supplierOrderController.deleteSupplierOrder
);

/**
 * @route   POST /api/supplier-orders/:id/complete
 * @desc    Complete a supplier order and add items to inventory
 * @access  Private (requires MANAGE_INVENTORY permission)
 */
router.post(
  '/:id/complete',
  authenticateJWT,
  logRequest,
  checkPermission('MANAGE_INVENTORY'),
  supplierOrderController.completeSupplierOrder
);

module.exports = router; 