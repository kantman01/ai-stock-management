const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const {
  createProductValidation,
  updateProductValidation,
  updateStockValidation
} = require('../utils/validators');

router.get('/', authenticateJWT, productController.getProducts);

router.get('/:id', authenticateJWT, productController.getProductById);

router.post(
  '/',
  authenticateJWT,
  checkPermission('MANAGE_PRODUCTS'),
  createProductValidation,
  productController.createProduct
);

router.put(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_PRODUCTS'),
  updateProductValidation,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_PRODUCTS'),
  productController.deleteProduct
);

router.post(
  '/:id/stock',
  authenticateJWT,
  checkPermission('MANAGE_INVENTORY'),
  updateStockValidation,
  productController.updateStock
);

router.get(
  '/:id/movements',
  authenticateJWT,
  productController.getStockMovements
);

/**
 * @route   POST /api/products/upload-image
 * @desc    Upload a product image
 * @access  Private (with MANAGE_PRODUCTS permission)
 */
router.post(
  '/upload-image',
  authenticateJWT,
  checkPermission('MANAGE_PRODUCTS'),
  productController.uploadProductImage
);

module.exports = router; 