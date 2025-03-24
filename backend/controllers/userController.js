const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const db = require('../config/db');

exports.getUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.phone, 
        u.position,
        u.department,
        u.is_active,
        u.last_login,
        u.created_at,
        r.id as role_id, 
        r.code as role_code, 
        r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `;

    const result = await db.query(query);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      position: user.position,
      department: user.department,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      role: {
        id: user.role_id,
        code: user.role_code,
        name: user.role_name
      }
    }));

    return res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const query = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.phone, 
        u.position,
        u.department,
        u.is_active,
        u.last_login,
        u.created_at,
        r.id as role_id, 
        r.code as role_code, 
        r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = result.rows[0];

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      position: user.position,
      department: user.department,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      role: {
        id: user.role_id,
        code: user.role_code,
        name: user.role_name
      }
    };

    return res.json({ user: userData });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.createUser = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    roleId,
    position,
    department,
    isActive
  } = req.body;

  try {

    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'This email address is already in use.' });
    }

    const roleCheck = await db.query('SELECT id FROM roles WHERE id = $1', [roleId]);

    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (
        email, 
        password, 
        first_name, 
        last_name, 
        phone, 
        role_id,
        position,
        department,
        is_active
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const insertResult = await db.query(insertQuery, [
      email,
      hashedPassword,
      firstName,
      lastName,
      phone,
      roleId,
      position,
      department,
      isActive !== undefined ? isActive : true
    ]);

    const newUserId = insertResult.rows[0].id;

    const roleQuery = `SELECT id, code, name FROM roles WHERE id = $1`;
    const roleResult = await db.query(roleQuery, [roleId]);
    const role = roleResult.rows[0];

    return res.status(201).json({
      message: 'User successfully created.',
      user: {
        id: newUserId,
        email,
        firstName,
        lastName,
        phone,
        position,
        department,
        isActive: isActive !== undefined ? isActive : true,
        role: {
          id: role.id,
          code: role.code,
          name: role.name
        }
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.updateUser = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.id;
  const {
    email,
    firstName,
    lastName,
    phone,
    roleId,
    position,
    department,
    isActive,
    password
  } = req.body;

  try {

    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'This email address is already in use.' });
    }

    if (roleId) {
      const roleCheck = await db.query('SELECT id FROM roles WHERE id = $1', [roleId]);

      if (roleCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid role.' });
      }
    }

    let updateValues = [];
    let updateFields = [];
    let valueIndex = 1;

    if (email) {
      updateFields.push(`email = $${valueIndex}`);
      updateValues.push(email);
      valueIndex++;
    }

    if (firstName) {
      updateFields.push(`first_name = $${valueIndex}`);
      updateValues.push(firstName);
      valueIndex++;
    }

    if (lastName) {
      updateFields.push(`last_name = $${valueIndex}`);
      updateValues.push(lastName);
      valueIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${valueIndex}`);
      updateValues.push(phone);
      valueIndex++;
    }

    if (roleId) {
      updateFields.push(`role_id = $${valueIndex}`);
      updateValues.push(roleId);
      valueIndex++;
    }

    if (position !== undefined) {
      updateFields.push(`position = $${valueIndex}`);
      updateValues.push(position);
      valueIndex++;
    }

    if (department !== undefined) {
      updateFields.push(`department = $${valueIndex}`);
      updateValues.push(department);
      valueIndex++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${valueIndex}`);
      updateValues.push(isActive);
      valueIndex++;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      updateFields.push(`password = $${valueIndex}`);
      updateValues.push(hashedPassword);
      valueIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) {
      return res.status(400).json({ message: 'No data to update.' });
    }

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id
    `;

    updateValues.push(userId);

    await db.query(updateQuery, updateValues);

    const updatedUserQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.phone, 
        u.position,
        u.department,
        u.is_active,
        r.id as role_id, 
        r.code as role_code, 
        r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;

    const updatedResult = await db.query(updatedUserQuery, [userId]);
    const updatedUser = updatedResult.rows[0];

    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      phone: updatedUser.phone,
      position: updatedUser.position,
      department: updatedUser.department,
      isActive: updatedUser.is_active,
      role: {
        id: updatedUser.role_id,
        code: updatedUser.role_code,
        name: updatedUser.role_name
      }
    };

    return res.json({
      message: 'User updated successfully.',
      user: userData
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {

    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (userId === '1') {
      return res.status(403).json({ message: 'Admin user cannot be deleted' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const query = 'SELECT id, code, name, description FROM roles ORDER BY id ASC';
    const result = await db.query(query);

    return res.json({ roles: result.rows });
  } catch (error) {
    console.error('Get roles error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.updateProfile = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { firstName, lastName, phone, position, department, bio } = req.body;

  try {

    let updateValues = [];
    let updateFields = [];
    let valueIndex = 1;

    if (firstName) {
      updateFields.push(`first_name = $${valueIndex}`);
      updateValues.push(firstName);
      valueIndex++;
    }

    if (lastName) {
      updateFields.push(`last_name = $${valueIndex}`);
      updateValues.push(lastName);
      valueIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${valueIndex}`);
      updateValues.push(phone);
      valueIndex++;
    }

    if (position !== undefined) {
      updateFields.push(`position = $${valueIndex}`);
      updateValues.push(position);
      valueIndex++;
    }

    if (department !== undefined) {
      updateFields.push(`department = $${valueIndex}`);
      updateValues.push(department);
      valueIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) {
      return res.status(400).json({ message: 'No data to update.' });
    }

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id
    `;

    updateValues.push(userId);

    await db.query(updateQuery, updateValues);

    return res.json({
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

/**
 * Get user permissions based on role
 */
exports.getUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await db.query('SELECT r.code FROM roles r JOIN users u ON r.id = u.role_id WHERE u.id = $1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = userResult.rows[0].role;


    const rolePermissions = {
      'admin': [
        'VIEW_DASHBOARD', 'VIEW_USERS', 'MANAGE_USERS', 'VIEW_PRODUCTS',
        'MANAGE_PRODUCTS', 'VIEW_CATEGORIES', 'MANAGE_CATEGORIES', 'VIEW_INVENTORY',
        'MANAGE_INVENTORY', 'VIEW_STOCK_MOVEMENTS', 'VIEW_ORDERS', 'MANAGE_ORDERS',
        'APPROVE_ORDERS', 'CREATE_ORDERS', 'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS',
        'VIEW_SUPPLIERS', 'MANAGE_SUPPLIERS', 'VIEW_ANALYTICS', 'VIEW_REPORTS',
        'VIEW_SALES_REPORT', 'VIEW_STOCK_REPORT', 'VIEW_CUSTOMER_REPORT',
        'VIEW_AI_ANALYTICS', 'MANAGE_SETTINGS'
      ],
      'customer': [
        'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'VIEW_CATEGORIES', 'VIEW_ORDERS',
        'APPROVE_ORDERS', 'CREATE_ORDERS', 'MANAGE_CATEGORIES'
      ],
      'supplier': [
        'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'VIEW_ORDERS', 'MANAGE_ORDERS',
        'VIEW_INVENTORY', 'MANAGE_CATEGORIES'
      ],
      'warehouse': [
        'VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'VIEW_CATEGORIES', 'VIEW_INVENTORY',
        'MANAGE_INVENTORY', 'VIEW_STOCK_MOVEMENTS', 'VIEW_ORDERS', 'VIEW_SUPPLIERS',
        'VIEW_REPORTS', 'VIEW_STOCK_REPORT', 'MANAGE_CATEGORIES'
      ]
    };

    const permissions = rolePermissions[role] || [];

    res.json(permissions);
  } catch (err) {
    console.error('Error fetching user permissions:', err);
    res.status(500).json({ message: 'Error fetching user permissions', error: err.message });
  }
}; 