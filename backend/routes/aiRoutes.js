const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

/**
 * @route   GET /api/ai/stock-predictions
 * @desc    Get AI-powered stock predictions
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/stock-predictions', 
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS), 
  aiController.getStockPredictions
);

/**
 * @route   GET /api/ai/sales-forecasts
 * @desc    Get AI-powered sales forecasts
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/sales-forecasts', 
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS), 
  aiController.getSalesForecasts
);

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get AI-powered business recommendations
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/recommendations', 
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS), 
  aiController.getRecommendations
);

/**
 * @route   POST /api/ai/orders/:order_id/analyze
 * @desc    Process a stock order after a product sale
 * @access  Private (Requires MANAGE_INVENTORY permission)
 */
router.post('/orders/:order_id/analyze', 
  checkPermission(PERMISSIONS.MANAGE_INVENTORY), 
  aiController.processStockOrder
);

/**
 * @route   POST /api/ai/inventory/analyze
 * @desc    Run scheduled inventory analysis
 * @access  Private (Requires MANAGE_INVENTORY permission)
 */
router.post('/inventory/analyze', 
  checkPermission(PERMISSIONS.MANAGE_INVENTORY), 
  aiController.runScheduledInventoryAnalysis
);

/**
 * @route   GET /api/ai/actions
 * @desc    Get recent AI actions for dashboard
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/actions', 
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS), 
  aiController.getRecentAIActions
);

/**
 * @route   GET /api/ai/interactions
 * @desc    Get AI interaction history
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/interactions', 
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS), 
  aiController.getAIInteractions
);

/**
 * @route   GET /api/ai/latest-analytics
 * @desc    Get latest AI analytics
 * @access  Private (Requires VIEW_AI_ANALYTICS permission)
 */
router.get('/latest-analytics',
  checkPermission(PERMISSIONS.VIEW_AI_ANALYTICS),
  aiController.getLatestAnalytics
);

/**
 * @route   POST /api/ai/stock-predictions/apply
 * @desc    Apply AI recommended stock predictions
 * @access  Private (Requires MANAGE_INVENTORY permission)
 */
router.post('/stock-predictions/apply', 
  checkPermission(PERMISSIONS.MANAGE_INVENTORY), 
  aiController.applyStockPredictions
);

module.exports = router; 