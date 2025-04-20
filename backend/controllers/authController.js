const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');

/**
 * Login endpoint that supports three types of users: staff, suppliers, and customers
 */
exports.login = async (req, res) => {
  const { email, password, userType = 'staff' } = req.body;

  try {
    let user = null;
    let permissions = [];
    
    const userQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.password, 
        u.first_name, 
        u.last_name, 
        u.is_active,
        r.id as role_id, 
        r.code as role_code,
        u.phone,
        u.position,
        u.department
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `;

    const userResult = await db.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
    }

    
    const permissionsQuery = `
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;

    const permissionsResult = await db.query(permissionsQuery, [user.role_id]);
    permissions = permissionsResult.rows.map(row => row.code);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    
    let supplierId = null;
    let customerId = null;
    let supplierDetails = null;
    let customerDetails = null;

    if (user.role_code === 'supplier') {
      const supplierQuery = 'SELECT * FROM suppliers WHERE user_id = $1';
      const supplierResult = await db.query(supplierQuery, [user.id]);
      if (supplierResult.rows.length > 0) {
        supplierId = supplierResult.rows[0].id;
        supplierDetails = supplierResult.rows[0];
      }
    } else if (user.role_code === 'customer') {
      const customerQuery = 'SELECT * FROM customers WHERE user_id = $1';
      const customerResult = await db.query(customerQuery, [user.id]);
      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
        customerDetails = customerResult.rows[0];
      }
    }

    
    const token = jwt.sign(
      { 
        userId: user.id,
        userType: userType.toLowerCase()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    
    const updateLoginQuery = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    
    await db.query(updateLoginQuery, [user.id]);

    
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: userType.toLowerCase(),
      role: {
        id: user.role_id,
        code: user.role_code,
        permissions: permissions
      },
      phone: user.phone,
      position: user.position,
      department: user.department
    };

    
    if (supplierId) {
      userResponse.supplierId = supplierId;
      userResponse.supplier = supplierDetails;
    }
    if (customerId) {
      userResponse.customerId = customerId;
      userResponse.customer = customerDetails;
    }
    return res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/**
 * Get current user information based on JWT token
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.is_active,
        r.id as role_id, 
        r.code as role_code
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
      
    const userResult = await db.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    const user = userResult.rows[0];
    
    
    const permissionsQuery = `
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;
    
    const permissionsResult = await db.query(permissionsQuery, [user.role_id]);
    const permissions = permissionsResult.rows.map(row => row.code);

    
    let supplierId = null;
    let customerId = null;
    let supplierDetails = null;
    let customerDetails = null;

    if (user.role_code === 'supplier') {
      const supplierQuery = 'SELECT * FROM suppliers WHERE user_id = $1';
      const supplierResult = await db.query(supplierQuery, [user.id]);
      if (supplierResult.rows.length > 0) {
        supplierId = supplierResult.rows[0].id;
        supplierDetails = supplierResult.rows[0];
      }
    } else if (user.role_code === 'customer') {
      const customerQuery = 'SELECT * FROM customers WHERE user_id = $1';
      const customerResult = await db.query(customerQuery, [user.id]);
      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
        customerDetails = customerResult.rows[0];
      }
    }
    
    
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: {
        id: user.role_id,
        code: user.role_code,
        permissions: permissions
      }
    };

    
    if (supplierId) {
      userResponse.supplierId = supplierId;
      userResponse.supplier = supplierDetails;
    }
    if (customerId) {
      userResponse.customerId = customerId;
      userResponse.customer = customerDetails;
    }
    
    return res.json({ 
      user: userResponse
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.changePassword = async (req, res) => {

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {

    const result = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const currentHashedPassword = result.rows[0].password;

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentHashedPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    return res.json({ message: 'Your password has been successfully changed.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.forgotPassword = async (req, res) => {

  const { email } = req.body;

  try {

    const userResult = await db.query('SELECT id, email, first_name FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {

      return res.json({ message: 'If your email exists in our system, a password reset link has been sent to your email address.' });
    }

    const user = userResult.rows[0];

    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [resetToken, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    console.log('RESET URL:', resetUrl);
    console.log('Email would be sent to:', user.email);



    return res.json({
      message: 'If your email exists in our system, a password reset link has been sent to your email address.',

      ...(process.env.NODE_ENV === 'development' && { resetUrl })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.resetPassword = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, newPassword } = req.body;

  try {

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const userResult = await db.query(
      'SELECT id FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [decoded.userId, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const userId = userResult.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    return res.json({ message: 'Your password has been successfully changed. Please login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}; 