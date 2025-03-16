const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const stockMovementController = require('../controllers/stockMovementController');

/**
 * @route   GET api/stock-movements
 * @desc    Get all stock movements with optional filtering
 * @access  Private
 */
router.get('/', authenticateJWT, stockMovementController.getStockMovements);

/**
 * @route   GET api/stock-movements/:id
 * @desc    Get a single stock movement by ID
 * @access  Private
 */
router.get('/:id', authenticateJWT, stockMovementController.getStockMovementById);

/**
 * @route   POST api/stock-movements
 * @desc    Create a new stock movement
 * @access  Private
 */
router.post('/', authenticateJWT, stockMovementController.createStockMovement);

/**
 * @route   GET api/stock-movements/products/recent
 * @desc    Get products with their latest stock movements
 * @access  Private
 */
router.get('/products/recent', authenticateJWT, stockMovementController.getProductsWithMovements);

module.exports = router; 