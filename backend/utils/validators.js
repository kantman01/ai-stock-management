const { body } = require('express-validator');

exports.loginValidation = [
  body('email')
    .notEmpty().withMessage('E-posta adresi gereklidir.')
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
  body('password')
    .notEmpty().withMessage('Şifre gereklidir.')
];

exports.createUserValidation = [
  body('email')
    .notEmpty().withMessage('E-posta adresi gereklidir.')
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
  body('password')
    .notEmpty().withMessage('Şifre gereklidir.')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('firstName')
    .notEmpty().withMessage('Ad gereklidir.'),
  body('lastName')
    .notEmpty().withMessage('Soyad gereklidir.'),
  body('roleId')
    .notEmpty().withMessage('Rol gereklidir.')
    .isInt().withMessage('Geçerli bir rol ID\'si giriniz.')
];

exports.updateUserValidation = [
  body('email')
    .optional()
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('roleId')
    .optional()
    .isInt().withMessage('Geçerli bir rol ID\'si giriniz.')
];

exports.changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Mevcut şifre gereklidir.'),
  body('newPassword')
    .notEmpty().withMessage('Yeni şifre gereklidir.')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('confirmPassword')
    .notEmpty().withMessage('Şifre tekrarı gereklidir.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Şifreler eşleşmiyor.');
      }
      return true;
    })
];

exports.updateProfileValidation = [
  body('firstName')
    .optional()
    .notEmpty().withMessage('Ad boş olamaz.'),
  body('lastName')
    .optional()
    .notEmpty().withMessage('Soyad boş olamaz.'),
  body('phone')
    .optional()
    .isString().withMessage('Telefon numarası geçerli bir format olmalıdır.')
];

exports.forgotPasswordValidation = [
  body('email')
    .notEmpty().withMessage('E-posta adresi gereklidir.')
    .isEmail().withMessage('Geçerli bir e-posta adresi giriniz.')
];

exports.resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Token gereklidir.'),
  body('newPassword')
    .notEmpty().withMessage('Yeni şifre gereklidir.')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('confirmPassword')
    .notEmpty().withMessage('Şifre tekrarı gereklidir.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Şifreler eşleşmiyor.');
      }
      return true;
    })
];

exports.createProductValidation = [
  body('name')
    .notEmpty().withMessage('Product name is required.')
    .isLength({ max: 255 }).withMessage('Product name must be less than 255 characters.'),
  body('barcode')
    .optional()
    .isString().withMessage('Barcode must be a string.'),
  body('sku')
    .optional()
    .isString().withMessage('SKU must be a string.'),
  body('category_id')
    .optional()
    .isInt().withMessage('Category ID must be an integer.'),
  body('price')
    .notEmpty().withMessage('Price is required.')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a positive integer.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.updateProductValidation = [
  body('name')
    .optional()
    .isLength({ max: 255 }).withMessage('Product name must be less than 255 characters.'),
  body('barcode')
    .optional()
    .isString().withMessage('Barcode must be a string.'),
  body('sku')
    .optional()
    .isString().withMessage('SKU must be a string.'),
  body('category_id')
    .optional()
    .isInt().withMessage('Category ID must be an integer.'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a positive integer.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.updateStockValidation = [
  body('quantity')
    .notEmpty().withMessage('Quantity is required.')
    .isInt().withMessage('Quantity must be an integer.'),
  body('movement_type')
    .notEmpty().withMessage('Movement type is required.')
    .isIn(['receipt', 'sale', 'adjustment', 'return', 'loss']).withMessage('Invalid movement type.'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.')
];

exports.createCategoryValidation = [
  body('name')
    .notEmpty().withMessage('Category name is required.')
    .isLength({ max: 255 }).withMessage('Category name must be less than 255 characters.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
  body('parent_id')
    .optional()
    .isInt().withMessage('Parent ID must be an integer.'),
  body('image_url')
    .optional()
    .isURL().withMessage('Image URL must be a valid URL.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.updateCategoryValidation = [
  body('name')
    .optional()
    .isLength({ max: 255 }).withMessage('Category name must be less than 255 characters.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
  body('parent_id')
    .optional()
    .isInt().withMessage('Parent ID must be an integer.'),
  body('image_url')
    .optional()
    .isURL().withMessage('Image URL must be a valid URL.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.createOrderValidation = [
  body('customer_id')
    .notEmpty().withMessage('Customer ID is required.')
    .isInt().withMessage('Customer ID must be an integer.'),
  body('items')
    .notEmpty().withMessage('Order items are required.')
    .isArray().withMessage('Order items must be an array.')
    .custom(items => {
      if (!items || !items.length) {
        throw new Error('Order must have at least one item');
      }
      for (const item of items) {
        if (!item.product_id) {
          throw new Error('Each item must have a product_id');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Each item must have a positive quantity');
        }
      }
      return true;
    }),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.'),
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'cancelled']).withMessage('Invalid order status.'),
  body('payment_status')
    .optional()
    .isIn(['unpaid', 'partial', 'paid']).withMessage('Invalid payment status.')
];

exports.updateOrderStatusValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'cancelled']).withMessage('Invalid order status.'),
  body('payment_status')
    .optional()
    .isIn(['unpaid', 'partial', 'paid']).withMessage('Invalid payment status.')
];

exports.createCustomerValidation = [
  body('first_name')
    .notEmpty().withMessage('First name is required.')
    .isLength({ max: 100 }).withMessage('First name must be less than 100 characters.'),
  body('last_name')
    .notEmpty().withMessage('Last name is required.')
    .isLength({ max: 100 }).withMessage('Last name must be less than 100 characters.'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be valid.'),
  body('phone')
    .optional()
    .isString().withMessage('Phone must be a string.'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string.'),
  body('city')
    .optional()
    .isString().withMessage('City must be a string.'),
  body('state')
    .optional()
    .isString().withMessage('State must be a string.'),
  body('postal_code')
    .optional()
    .isString().withMessage('Postal code must be a string.'),
  body('country')
    .optional()
    .isString().withMessage('Country must be a string.'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.updateCustomerValidation = [
  body('first_name')
    .optional()
    .isLength({ max: 100 }).withMessage('First name must be less than 100 characters.'),
  body('last_name')
    .optional()
    .isLength({ max: 100 }).withMessage('Last name must be less than 100 characters.'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be valid.'),
  body('phone')
    .optional()
    .isString().withMessage('Phone must be a string.'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string.'),
  body('city')
    .optional()
    .isString().withMessage('City must be a string.'),
  body('state')
    .optional()
    .isString().withMessage('State must be a string.'),
  body('postal_code')
    .optional()
    .isString().withMessage('Postal code must be a string.'),
  body('country')
    .optional()
    .isString().withMessage('Country must be a string.'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.createSupplierValidation = [
  body('name')
    .notEmpty().withMessage('Supplier name is required.')
    .isLength({ max: 255 }).withMessage('Supplier name must be less than 255 characters.'),
  body('contact_name')
    .optional()
    .isString().withMessage('Contact name must be a string.'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be valid.'),
  body('phone')
    .optional()
    .isString().withMessage('Phone must be a string.'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string.'),
  body('city')
    .optional()
    .isString().withMessage('City must be a string.'),
  body('state')
    .optional()
    .isString().withMessage('State must be a string.'),
  body('postal_code')
    .optional()
    .isString().withMessage('Postal code must be a string.'),
  body('country')
    .optional()
    .isString().withMessage('Country must be a string.'),
  body('tax_id')
    .optional()
    .isString().withMessage('Tax ID must be a string.'),
  body('website')
    .optional()
    .isURL().withMessage('Website must be a valid URL.'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.'),
  body('payment_terms')
    .optional()
    .isString().withMessage('Payment terms must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
];

exports.updateSupplierValidation = [
  body('name')
    .optional()
    .isLength({ max: 255 }).withMessage('Supplier name must be less than 255 characters.'),
  body('contact_name')
    .optional()
    .isString().withMessage('Contact name must be a string.'),
  body('email')
    .optional()
    .isEmail().withMessage('Email must be valid.'),
  body('phone')
    .optional()
    .isString().withMessage('Phone must be a string.'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string.'),
  body('city')
    .optional()
    .isString().withMessage('City must be a string.'),
  body('state')
    .optional()
    .isString().withMessage('State must be a string.'),
  body('postal_code')
    .optional()
    .isString().withMessage('Postal code must be a string.'),
  body('country')
    .optional()
    .isString().withMessage('Country must be a string.'),
  body('tax_id')
    .optional()
    .isString().withMessage('Tax ID must be a string.'),
  body('website')
    .optional()
    .isURL().withMessage('Website must be a valid URL.'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string.'),
  body('payment_terms')
    .optional()
    .isString().withMessage('Payment terms must be a string.'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean value.')
]; 