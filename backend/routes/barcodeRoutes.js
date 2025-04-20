const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const { authenticateJWT } = require('../middleware/auth');


const logBarcodeRequest = (req, res, next) => {
  console.log(`[DEBUG API] Barcode scan request received:`, {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    user: req.user ? { id: req.user.id, role: req.user.role?.code || 'Unknown' } : 'No user'
  });
  next();
};

/**
 * @route POST /api/barcode/scan
 * @desc Scan a barcode and check for shipped orders containing this product
 * @access Private
 */
router.post('/scan', authenticateJWT, logBarcodeRequest, barcodeController.scanBarcode);

module.exports = router; 