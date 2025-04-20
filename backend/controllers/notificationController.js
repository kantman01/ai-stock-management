const { query } = require('../config/db');

/**
 * Get notifications for a user
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sql = `
      SELECT n.*, 
        CASE WHEN nr.id IS NOT NULL THEN true ELSE false END as read
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
      WHERE 
        n.user_id = $1 OR 
        (n.role_id IS NOT NULL AND n.role_id = $2) OR
        n.is_global = true
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    
    const result = await query(sql, [userId, req.user.role_id]);
    
    res.json({
      message: 'Notifications retrieved successfully',
      notifications: result.rows
    });
  } catch (err) {
    console.error('Error retrieving notifications:', err);
    res.status(500).json({
      message: 'Error retrieving notifications',
      error: err.message
    });
  }
};

/**
 * Create a new notification
 */
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, user_id, role_id, is_global, action_link, reference_id, reference_type } = req.body;
    
    const sql = `
      INSERT INTO notifications (
        title, message, type, user_id, role_id, is_global, 
        action_link, reference_id, reference_type, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `;
    
    const result = await query(sql, [
      title,
      message,
      type || 'info',
      user_id || null,
      role_id || null,
      is_global || false,
      action_link || null,
      reference_id || null,
      reference_type || null
    ]);
    
    res.status(201).json({
      message: 'Notification created successfully',
      notification_id: result.rows[0].id
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({
      message: 'Error creating notification',
      error: err.message
    });
  }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const userId = req.user.id;
    
    
    const checkSql = `
      SELECT * FROM notification_reads 
      WHERE notification_id = $1 AND user_id = $2
    `;
    
    const checkResult = await query(checkSql, [notification_id, userId]);
    
    if (checkResult.rows.length === 0) {
      
      const insertSql = `
        INSERT INTO notification_reads (notification_id, user_id, read_at)
        VALUES ($1, $2, NOW())
      `;
      
      await query(insertSql, [notification_id, userId]);
    }
    
    res.json({
      message: 'Notification marked as read successfully'
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({
      message: 'Error marking notification as read',
      error: err.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    
    const notesSql = `
      SELECT n.id
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = $1
      WHERE 
        (n.user_id = $1 OR 
         (n.role_id IS NOT NULL AND n.role_id = $2) OR
         n.is_global = true) AND
        nr.id IS NULL
    `;
    
    const notesResult = await query(notesSql, [userId, req.user.role_id]);
    
    if (notesResult.rows.length > 0) {
      
      const notificationIds = notesResult.rows.map(row => row.id);
      
      for (const noteId of notificationIds) {
        const insertSql = `
          INSERT INTO notification_reads (notification_id, user_id, read_at)
          VALUES ($1, $2, NOW())
        `;
        
        await query(insertSql, [noteId, userId]);
      }
    }
    
    res.json({
      message: 'All notifications marked as read',
      count: notesResult.rows.length
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({
      message: 'Error marking all notifications as read',
      error: err.message
    });
  }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const userId = req.user.id;
    
    
    const checkSql = `
      SELECT * FROM notifications
      WHERE id = $1 AND (user_id = $2 OR created_by = $2)
    `;
    
    const checkResult = await query(checkSql, [notification_id, userId]);
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        message: 'You do not have permission to delete this notification'
      });
    }
    
    
    const deleteSql = `DELETE FROM notifications WHERE id = $1`;
    await query(deleteSql, [notification_id]);
    
    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({
      message: 'Error deleting notification',
      error: err.message
    });
  }
};

/**
 * Create a system notification (called by other controllers)
 */
exports.createSystemNotification = async (data) => {
  try {
    const { 
      title, 
      message, 
      type, 
      user_id, 
      role_id, 
      role_code, 
      is_global, 
      action_link, 
      reference_id, 
      reference_type 
    } = data;
    
    
    const isGlobalNotification = is_global || (!user_id && !role_id && !role_code);
    
    
    let effectiveRoleId = null;
    
    if (role_id) {
      const roleCheckSql = `SELECT id FROM roles WHERE id = $1`;
      const roleCheck = await query(roleCheckSql, [role_id]);
      
      if (roleCheck.rows.length > 0) {
        effectiveRoleId = role_id;
      } else {
        console.warn(`Role ID ${role_id} not found. Creating notification without role targeting.`);
      }
    } else if (role_code) {
      
      const roleCheckSql = `SELECT id FROM roles WHERE code = $1`;
      const roleCheck = await query(roleCheckSql, [role_code]);
      
      if (roleCheck.rows.length > 0) {
        effectiveRoleId = roleCheck.rows[0].id;
        console.log(`Using role ID ${effectiveRoleId} for role code ${role_code}`);
      } else {
        console.warn(`Role code ${role_code} not found. Creating notification without role targeting.`);
      }
    }
    
    const sql = `
      INSERT INTO notifications (
        title, message, type, user_id, role_id, is_global, 
        action_link, reference_id, reference_type, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `;
    
    const result = await query(sql, [
      title,
      message,
      type || 'info',
      user_id || null,
      effectiveRoleId, 
      isGlobalNotification, 
      action_link || null,
      reference_id || null,
      reference_type || null
    ]);
    
    console.log(`System notification created: ${title}${effectiveRoleId ? ` - For role ${effectiveRoleId}` : ''}${user_id ? ` - For user ${user_id}` : ''}${isGlobalNotification ? ' - Global' : ''}`);
    return result.rows[0].id;
  } catch (err) {
    console.error('Error creating system notification:', err);
    return null;
  }
}; 