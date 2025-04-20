const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const productController = require('../controllers/productController');


router.post('/products/upload-image', uploadController.uploadProductImage);


router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);


router.use(uploadController.handleMulterErrors);

module.exports = router; 