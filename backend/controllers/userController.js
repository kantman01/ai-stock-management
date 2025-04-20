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
    isActive,
    
    address,
    city,
    postalCode,
    country,
    companyName,
    notes,
    
    supplierName,
    taxId,
    website,
    paymentTerms
  } = req.body;

  try {
    
    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'This email address is already in use.' });
    }

    
    const roleCheck = await db.query('SELECT id, code FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const roleCode = roleCheck.rows[0].code;

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    await db.query('BEGIN');

    try {
      
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
        phone || null,
        roleId,
        position || null,
        department || null,
        isActive !== undefined ? isActive : true
      ]);

      const newUserId = insertResult.rows[0].id;

      
      if (roleCode === 'customer') {
        if (!address || !city || !country) {
          await db.query('ROLLBACK');
          return res.status(400).json({ message: 'Address, city and country are required for customers.' });
        }

        const customerInsertQuery = `
          INSERT INTO customers (
            first_name, 
            last_name, 
            email, 
            phone, 
            address, 
            city,
            postal_code, 
            country, 
            company_name, 
            notes, 
            is_active, 
            created_by, 
            user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `;

        const customerValues = [
          firstName,
          lastName,
          email,
          phone || null,
          address,
          city,
          postalCode || null,
          country,
          companyName || null,
          notes || null,
          isActive !== undefined ? isActive : true,
          req.user?.id || null,
          newUserId
        ];

        const customerResult = await db.query(customerInsertQuery, customerValues);
        const customerId = customerResult.rows[0].id;

        
        await db.query('UPDATE users SET customer_id = $1 WHERE id = $2', [customerId, newUserId]);
      }
      
      
      else if (roleCode === 'supplier') {
        if (!supplierName || !address || !city || !country) {
          await db.query('ROLLBACK');
          return res.status(400).json({ message: 'Company name, address, city and country are required for suppliers.' });
        }

        const contactName = `${firstName} ${lastName}`.trim();
        
        const supplierInsertQuery = `
          INSERT INTO suppliers (
            name, 
            contact_name, 
            email, 
            phone, 
            address, 
            city,
            postal_code, 
            country, 
            tax_id, 
            website, 
            notes,
            payment_terms, 
            is_active, 
            created_by, 
            user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `;

        const supplierValues = [
          supplierName,
          contactName,
          email,
          phone || null,
          address,
          city,
          postalCode || null,
          country,
          taxId || null,
          website || null,
          notes || null,
          paymentTerms || null,
          isActive !== undefined ? isActive : true,
          req.user?.id || null,
          newUserId
        ];

        const supplierResult = await db.query(supplierInsertQuery, supplierValues);
        const supplierId = supplierResult.rows[0].id;

        
        await db.query('UPDATE users SET supplier_id = $1 WHERE id = $2', [supplierId, newUserId]);
      }

      
      await db.query('COMMIT');

      
      const roleQuery = `SELECT id, code, name FROM roles WHERE id = $1`;
      const roleResult = await db.query(roleQuery, [roleId]);
      const role = roleResult.rows[0];

      
      const userData = {
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
      };

      
      if (roleCode === 'customer') {
        userData.customerInfo = {
          address,
          city,
          postalCode,
          country,
          companyName
        };
      } else if (roleCode === 'supplier') {
        userData.supplierInfo = {
          name: supplierName,
          address,
          city,
          postalCode,
          country,
          taxId,
          website,
          paymentTerms
        };
      }

      return res.status(201).json({
        message: 'User successfully created.',
        user: userData
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
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

  
  
  const userId = req.params.id === 'me' ? req.user.id : req.params.id;
  const isOwnProfile = req.params.id === 'me' || userId === req.user.id;
  
  const {
    email,
    firstName,
    lastName,
    phone,
    roleId,
    position,
    department,
    isActive,
    password,
    supplierName,
    address,
    city,
    country,
    postalCode,
    website,
    notes,
    taxId,
    paymentTerms,
    
    companyName
  } = req.body;

  try {
    
    const userCheck = await db.query('SELECT id, role_id FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    
    if (email) {
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'This email address is already in use.' });
      }
    }

    
    if (roleId && !isOwnProfile) {
      const roleCheck = await db.query('SELECT id, code FROM roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid role.' });
      }
    }

    
    const roleQuery = 'SELECT code FROM roles WHERE id = $1';
    const roleResult = await db.query(roleQuery, [userCheck.rows[0].role_id]);
    const userRole = roleResult.rows[0]?.code;

    
    await db.query('BEGIN');

    try {
      
      let updateValues = [];
      let updateFields = [];
      let valueIndex = 1;

      
      if ((email && isOwnProfile) || !isOwnProfile) {
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

      
      if (!isOwnProfile) {
        if (roleId) {
          updateFields.push(`role_id = $${valueIndex}`);
          updateValues.push(roleId);
          valueIndex++;
        }

        if (isActive !== undefined) {
          updateFields.push(`is_active = $${valueIndex}`);
          updateValues.push(isActive);
          valueIndex++;
        }
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


      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        updateFields.push(`password = $${valueIndex}`);
        updateValues.push(hashedPassword);
        valueIndex++;
      }

      if (updateFields.length <= 2) { 
        await db.query('ROLLBACK');
        return res.status(400).json({ message: 'No data to update.' });
      }

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING id, first_name, last_name, email, phone, position, department, role_id, is_active
      `;

      updateValues.push(userId);
      const result = await db.query(updateQuery, updateValues);
      
      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found.' });
      }
      
      const updatedUser = result.rows[0];
      
      
      if (userRole === 'customer') {
        const customerQuery = 'SELECT id FROM customers WHERE user_id = $1';
        const customerResult = await db.query(customerQuery, [userId]);
        
        if (customerResult.rows.length > 0) {
          const customerId = customerResult.rows[0].id;
          
          
          let customerUpdateFields = [];
          let customerUpdateValues = [];
          let customerValueIndex = 1;
          
          if (firstName || lastName) {
            customerUpdateFields.push(`first_name = $${customerValueIndex}`);
            customerUpdateValues.push(firstName || updatedUser.first_name);
            customerValueIndex++;
            
            customerUpdateFields.push(`last_name = $${customerValueIndex}`);
            customerUpdateValues.push(lastName || updatedUser.last_name);
            customerValueIndex++;
          }
          
          if (phone !== undefined) {
            customerUpdateFields.push(`phone = $${customerValueIndex}`);
            customerUpdateValues.push(phone);
            customerValueIndex++;
          }
          
          if (email) {
            customerUpdateFields.push(`email = $${customerValueIndex}`);
            customerUpdateValues.push(email);
            customerValueIndex++;
          }
          
          if (address !== undefined) {
            customerUpdateFields.push(`address = $${customerValueIndex}`);
            customerUpdateValues.push(address);
            customerValueIndex++;
          }
          
          if (city !== undefined) {
            customerUpdateFields.push(`city = $${customerValueIndex}`);
            customerUpdateValues.push(city);
            customerValueIndex++;
          }
          
          if (country !== undefined) {
            customerUpdateFields.push(`country = $${customerValueIndex}`);
            customerUpdateValues.push(country);
            customerValueIndex++;
          }
          
          if (postalCode !== undefined) {
            customerUpdateFields.push(`postal_code = $${customerValueIndex}`);
            customerUpdateValues.push(postalCode);
            customerValueIndex++;
          }
          
          if (companyName !== undefined) {
            customerUpdateFields.push(`company_name = $${customerValueIndex}`);
            customerUpdateValues.push(companyName);
            customerValueIndex++;
          }
          
          if (notes !== undefined) {
            customerUpdateFields.push(`notes = $${customerValueIndex}`);
            customerUpdateValues.push(notes);
            customerValueIndex++;
          }
          
          if (isActive !== undefined) {
            customerUpdateFields.push(`is_active = $${customerValueIndex}`);
            customerUpdateValues.push(isActive);
            customerValueIndex++;
          }
          
          customerUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          
          if (customerUpdateFields.length > 1) { 
            const customerUpdateQuery = `
              UPDATE customers 
              SET ${customerUpdateFields.join(', ')}
              WHERE id = $${customerValueIndex}
            `;
            
            customerUpdateValues.push(customerId);
            await db.query(customerUpdateQuery, customerUpdateValues);
          }
        }
      } else if (userRole === 'supplier') {
        const supplierQuery = 'SELECT id FROM suppliers WHERE user_id = $1';
        const supplierResult = await db.query(supplierQuery, [userId]);
        
        if (supplierResult.rows.length > 0) {
          const supplierId = supplierResult.rows[0].id;
          
          
          let supplierUpdateFields = [];
          let supplierUpdateValues = [];
          let supplierValueIndex = 1;
          
          if (firstName || lastName) {
            const contactName = `${firstName || updatedUser.first_name} ${lastName || updatedUser.last_name}`;
            supplierUpdateFields.push(`contact_name = $${supplierValueIndex}`);
            supplierUpdateValues.push(contactName);
            supplierValueIndex++;
          }
          
          if (phone !== undefined) {
            supplierUpdateFields.push(`phone = $${supplierValueIndex}`);
            supplierUpdateValues.push(phone);
            supplierValueIndex++;
          }
          
          if (email) {
            supplierUpdateFields.push(`email = $${supplierValueIndex}`);
            supplierUpdateValues.push(email);
            supplierValueIndex++;
          }
          
          if (supplierName !== undefined) {
            supplierUpdateFields.push(`name = $${supplierValueIndex}`);
            supplierUpdateValues.push(supplierName);
            supplierValueIndex++;
          }
          
          if (address !== undefined) {
            supplierUpdateFields.push(`address = $${supplierValueIndex}`);
            supplierUpdateValues.push(address);
            supplierValueIndex++;
          }
          
          if (city !== undefined) {
            supplierUpdateFields.push(`city = $${supplierValueIndex}`);
            supplierUpdateValues.push(city);
            supplierValueIndex++;
          }
          
          if (country !== undefined) {
            supplierUpdateFields.push(`country = $${supplierValueIndex}`);
            supplierUpdateValues.push(country);
            supplierValueIndex++;
          }
          
          if (postalCode !== undefined) {
            supplierUpdateFields.push(`postal_code = $${supplierValueIndex}`);
            supplierUpdateValues.push(postalCode);
            supplierValueIndex++;
          }
          
          if (website !== undefined) {
            supplierUpdateFields.push(`website = $${supplierValueIndex}`);
            supplierUpdateValues.push(website);
            supplierValueIndex++;
          }
          
          if (notes !== undefined) {
            supplierUpdateFields.push(`notes = $${supplierValueIndex}`);
            supplierUpdateValues.push(notes);
            supplierValueIndex++;
          }
          
          if (isActive !== undefined) {
            supplierUpdateFields.push(`is_active = $${supplierValueIndex}`);
            supplierUpdateValues.push(isActive);
            supplierValueIndex++;
          }
          
          if (taxId !== undefined) {
            supplierUpdateFields.push(`tax_id = $${supplierValueIndex}`);
            supplierUpdateValues.push(taxId);
            supplierValueIndex++;
          }
          
          if (paymentTerms !== undefined) {
            supplierUpdateFields.push(`payment_terms = $${supplierValueIndex}`);
            supplierUpdateValues.push(paymentTerms);
            supplierValueIndex++;
          }
          
          supplierUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          
          if (supplierUpdateFields.length > 1) { 
            const supplierUpdateQuery = `
              UPDATE suppliers 
              SET ${supplierUpdateFields.join(', ')}
              WHERE id = $${supplierValueIndex}
            `;
            
            supplierUpdateValues.push(supplierId);
            await db.query(supplierUpdateQuery, supplierUpdateValues);
          }
        }
      }
      
      
      await db.query('COMMIT');

      
      const updatedRoleQuery = 'SELECT id, code, name FROM roles WHERE id = $1';
      const updatedRoleResult = await db.query(updatedRoleQuery, [updatedUser.role_id]);
      const roleData = updatedRoleResult.rows[0];

      
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
          id: roleData.id,
          code: roleData.code,
          name: roleData.name
        }
      };

      return res.json({
        message: 'User updated successfully.',
        user: userData
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
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