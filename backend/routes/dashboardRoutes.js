const express = require('express');
const router = express.Router();
const { authenticateJWT, checkPermission } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/stats', authenticateJWT, dashboardController.getDashboardStats);

/**
 * @route   GET /api/dashboard/sales
 * @desc    Get sales data for the last 7 days
 * @access  Private
 */
router.get('/sales', authenticateJWT, dashboardController.getSalesData);

/**
 * @route   GET /api/dashboard/activities
 * @desc    Get recent activities for the dashboard
 * @access  Private
 */
router.get('/activities', authenticateJWT, dashboardController.getRecentActivities);

/**
 * @route   GET /api/dashboard/supplier-stats
 * @desc    Get supplier-specific dashboard statistics
 * @access  Private
 */
router.get('/supplier-stats', authenticateJWT, dashboardController.getSupplierStats);

/**
 * @route   GET /api/dashboard/customer-stats
 * @desc    Get customer-specific dashboard statistics
 * @access  Private
 */
router.get('/customer-stats', authenticateJWT, dashboardController.getCustomerStats);

module.exports = router; 