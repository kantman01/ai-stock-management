const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const {
  createCategoryValidation,
  updateCategoryValidation
} = require('../utils/validators');

router.get('/', authenticateJWT, categoryController.getCategories);

router.get('/:id', authenticateJWT, categoryController.getCategoryById);

router.get('/:id/subcategories', authenticateJWT, categoryController.getCategoryWithSubcategories);

router.get('/:id/products', authenticateJWT, categoryController.getCategoryProducts);

router.post(
  '/',
  authenticateJWT,
  checkPermission('MANAGE_CATEGORIES'),
  createCategoryValidation,
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_CATEGORIES'),
  updateCategoryValidation,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticateJWT,
  checkPermission('MANAGE_CATEGORIES'),
  categoryController.deleteCategory
);

module.exports = router; 