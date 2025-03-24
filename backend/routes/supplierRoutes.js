const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const {
  createSupplierValidation,
  updateSupplierValidation
} = require('../utils/validators');

router.get('/', authenticateJWT, supplierController.getSuppliers);

router.get('/:id', authenticateJWT, supplierController.getSupplierById);

router.get('/:id/products', authenticateJWT, supplierController.getSupplierProducts);

router.post(
  '/',
  authenticateJWT,
  checkPermission('MANAGE_SUPPLIERS'),
  createSupplierValidation,
  supplierController.createSupplier
);

router.put(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_SUPPLIERS'),
  updateSupplierValidation,
  supplierController.updateSupplier
);

router.delete(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_SUPPLIERS'),
  supplierController.deleteSupplier
);

module.exports = router; 