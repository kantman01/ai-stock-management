const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for the current user
 * @access  Private
 */
router.get('/', authenticateJWT, notificationController.getNotifications);

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification
 * @access  Private (Admin only)
 */
router.post('/', authenticateJWT, notificationController.createNotification);

/**
 * @route   PUT /api/notifications/:notification_id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:notification_id/read', authenticateJWT, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateJWT, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:notification_id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:notification_id', authenticateJWT, notificationController.deleteNotification);

module.exports = router; 