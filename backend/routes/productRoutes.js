const express = require('express'); // Express framework'ünü import ediyoruz
const router = express.Router(); // Router nesnesi oluşturuyoruz. Bu nesne route'ları tanımlamak için kullanılır
const productController = require('../controllers/productController'); // Ürünlerle ilgili işlemleri gerçekleştiren controller dosyasını import ediyoruz
const { authenticateJWT, checkPermission } = require('../middleware/auth'); // JWT doğrulaması ve yetki kontrolü için middleware'leri içeri aktarıyoruz

const {
  createProductValidation,
  updateProductValidation,
  updateStockValidation
} = require('../utils/validators');

//Ürün ekleme/güncelleme/stok işlemleri için gerekli validasyon kurallarını alıyoruz.



router.get('/', authenticateJWT, productController.getProducts);


router.get('/all-supplier-products', authenticateJWT, checkPermission('MANAGE_PRODUCTS'), productController.getAllSupplierProducts);

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

module.exports = router;  // Bu router dosyasını dışa aktarıyoruz ki app.js'de kullanılabilsin

/**✅ Örnek Senaryo:
Bir kullanıcı "ürün sil" butonuna bastı:

Frontend'den DELETE /api/products/123 isteği gönderilir

Bu productRoutes.js içindeki router.delete('/:id', deleteProduct) ile eşleşir

deleteProduct fonksiyonu çalışır, ürün veritabanından silinir

JSON cevabı döner: { message: 'Ürün silindi' }*/