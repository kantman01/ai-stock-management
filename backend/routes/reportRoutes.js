const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

/**
 * @route   GET /api/reports
 * @desc    Get all reports
 * @access  Private
 */
router.get('/', authenticateJWT, reportController.getReports);

/**
 * @route   GET /api/reports/:id
 * @desc    Get a report by ID
 * @access  Private
 */
router.get('/:id', authenticateJWT, reportController.getReportById);

/**
 * @route   POST /api/reports 
 * @desc    Create a new report
 * @access  Private
 */
router.post('/', authenticateJWT, reportController.createReport);

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete a report
 * @access  Private
 */
router.delete('/:id', authenticateJWT, reportController.deleteReport);

module.exports = router; 