const { query } = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Get all customers with optional filtering
 */
exports.getCustomers = async (req, res) => {
  try {
    const {
      search,
      is_active,
      sort_by = 'created_at',
      sort_dir = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT c.*, 
      (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id) as total_spent
      FROM customers c
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      sql += ` AND (c.first_name ILIKE $${params.length + 1} OR c.last_name ILIKE $${params.length + 1} OR c.email ILIKE $${params.length + 1} OR c.phone ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      sql += ` AND c.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await query(countSql.split('ORDER BY')[0], params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY ${sort_by} ${sort_dir}`;

    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Error fetching customers', error: err.message });
  }
};

/**
 * Get a single customer by ID with their order history
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customerSql = `
      SELECT c.*,
      (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id) as total_spent,
      u.email as user_email, u.is_active as user_is_active
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const customerResult = await query(customerSql, [id]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    const ordersSql = `
      SELECT id, order_number, created_at, status, payment_status, total_amount
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const ordersResult = await query(ordersSql, [id]);

    customer.recent_orders = ordersResult.rows;

    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ message: 'Error fetching customer', error: err.message });
  }
};

/**
 * Create a new customer with a user account
 */
exports.createCustomer = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      address,
      city,
      postal_code,
      country,
      company_name,
      notes,
      is_active = true
    } = req.body;

    
    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required for the customer account' });
    }

    
    if (email) {
      const emailCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
    }

    
    await query('BEGIN');

    try {
      
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      
      const roleResult = await query('SELECT id FROM roles WHERE code = $1', ['customer']);
      if (roleResult.rows.length === 0) {
        throw new Error('Customer role not found');
      }
      const roleId = roleResult.rows[0].id;

      
      const userSql = `
        INSERT INTO users (
          email, password, first_name, last_name, role_id, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const userResult = await query(userSql, [
        email,
        hashedPassword,
        first_name,
        last_name,
        roleId,
        is_active
      ]);

      const userId = userResult.rows[0].id;

      
      const customerSql = `
        INSERT INTO customers (
          first_name, last_name, email, phone, address, city,
           postal_code, country, company_name, notes, 
          is_active,  user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
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
        userId
      ];

      const customerResult = await query(customerSql, values);
      
      
      await query('COMMIT');

      
      res.status(201).json({
        ...customerResult.rows[0],
        user: {
          id: userId,
          email,
          first_name,
          last_name,
          is_active
        }
      });
    } catch (error) {
      
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Error creating customer', error: err.message });
  }
};

/**
 * Update a customer and associated user
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      address,
      city,
      postal_code,
      country,
      company_name,
      notes,
      is_active
    } = req.body;

    
    const checkResult = await query('SELECT * FROM customers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = checkResult.rows[0];
    const userId = customer.user_id;

    
    if (email && email !== customer.email) {
      const emailCheck = await query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
    }

    await query('BEGIN');

    try {
      
      if (userId) {
        const userUpdates = [];
        const userValues = [];
        let userParamCount = 1;

        if (email !== undefined) {
          userUpdates.push(`email = $${userParamCount++}`);
          userValues.push(email);
        }

        if (first_name !== undefined) {
          userUpdates.push(`first_name = $${userParamCount++}`);
          userValues.push(first_name);
        }

        if (last_name !== undefined) {
          userUpdates.push(`last_name = $${userParamCount++}`);
          userValues.push(last_name);
        }

        if (is_active !== undefined) {
          userUpdates.push(`is_active = $${userParamCount++}`);
          userValues.push(is_active);
        }

        
        if (password) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          userUpdates.push(`password = $${userParamCount++}`);
          userValues.push(hashedPassword);
        }

        if (userUpdates.length > 0) {
          userUpdates.push(`updated_at = NOW()`);
          
          const userSql = `
            UPDATE users 
            SET ${userUpdates.join(', ')}
            WHERE id = $${userParamCount}
          `;
          
          userValues.push(userId);
          await query(userSql, userValues);
        }
      }

      
      const customerUpdates = [];
      const customerValues = [];
      let customerParamCount = 1;

      if (first_name !== undefined) {
        customerUpdates.push(`first_name = $${customerParamCount++}`);
        customerValues.push(first_name);
      }

      if (last_name !== undefined) {
        customerUpdates.push(`last_name = $${customerParamCount++}`);
        customerValues.push(last_name);
      }

      if (email !== undefined) {
        customerUpdates.push(`email = $${customerParamCount++}`);
        customerValues.push(email);
      }

      if (phone !== undefined) {
        customerUpdates.push(`phone = $${customerParamCount++}`);
        customerValues.push(phone);
      }

      if (address !== undefined) {
        customerUpdates.push(`address = $${customerParamCount++}`);
        customerValues.push(address);
      }

      if (city !== undefined) {
        customerUpdates.push(`city = $${customerParamCount++}`);
        customerValues.push(city);
      }

      if (postal_code !== undefined) {
        customerUpdates.push(`postal_code = $${customerParamCount++}`);
        customerValues.push(postal_code);
      }

      if (country !== undefined) {
        customerUpdates.push(`country = $${customerParamCount++}`);
        customerValues.push(country);
      }

      if (company_name !== undefined) {
        customerUpdates.push(`company_name = $${customerParamCount++}`);
        customerValues.push(company_name);
      }

      if (notes !== undefined) {
        customerUpdates.push(`notes = $${customerParamCount++}`);
        customerValues.push(notes);
      }

      if (is_active !== undefined) {
        customerUpdates.push(`is_active = $${customerParamCount++}`);
        customerValues.push(is_active);
      }

      customerUpdates.push(`updated_at = NOW()`);

      if (customerUpdates.length > 0) {
        const sql = `
          UPDATE customers
          SET ${customerUpdates.join(', ')}
          WHERE id = $${customerParamCount}
          RETURNING *
        `;

        customerValues.push(id);
        const result = await query(sql, customerValues);
        
        await query('COMMIT');
        
        
        let userInfo = null;
        if (userId) {
          const userResult = await query(
            'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
            [userId]
          );
          if (userResult.rows.length > 0) {
            userInfo = userResult.rows[0];
          }
        }
        
        res.json({
          ...result.rows[0],
          user: userInfo
        });
      } else {
        await query('COMMIT');
        res.status(400).json({ message: 'No fields to update' });
      }
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ message: 'Error updating customer', error: err.message });
  }
};

/**
 * Delete a customer and optionally deactivate associated user
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteUser = false } = req.body; 

    
    const checkResult = await query('SELECT * FROM customers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const userId = checkResult.rows[0].user_id;

    const ordersResult = await query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [id]);
    const hasOrders = parseInt(ordersResult.rows[0].count) > 0;

    await query('BEGIN');

    try {
      
      if (hasOrders) {
        
        await query(
          'UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = $1',
          [id]
        );

        
        if (userId) {
          await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
        }

        await query('COMMIT');
        return res.json({ message: 'Customer deactivated due to existing orders' });
      }

      
      await query('DELETE FROM customers WHERE id = $1', [id]);

      
      if (userId) {
        if (deleteUser) {
          
          const otherAssociationsCheck = await query(
            'SELECT 1 FROM suppliers WHERE user_id = $1 LIMIT 1',
            [userId]
          );

          if (otherAssociationsCheck.rows.length === 0) {
            
            await query('DELETE FROM users WHERE id = $1', [userId]);
          } else {
            
            await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
          }
        } else {
          
          await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
        }
      }

      await query('COMMIT');
      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ message: 'Error deleting customer', error: err.message });
  }
};

/**
 * Get customer orders
 */
exports.getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const checkResult = await query('SELECT * FROM customers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const ordersSql = `
      SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const ordersResult = await query(ordersSql, [id, limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [id]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: ordersResult.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ message: 'Error fetching customer orders', error: err.message });
  }
}; 