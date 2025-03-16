const { query } = require('../config/db');

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
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id) as total_spent
      FROM customers c
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
 * Create a new customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      notes,
      is_active = true 
    } = req.body;
    
    
    if (!first_name || !last_name) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
    
    
    if (email) {
      const emailCheck = await query('SELECT * FROM customers WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A customer with this email already exists' });
      }
    }
    
    const sql = `
      INSERT INTO customers (
        first_name, last_name, email, phone, address, city,
        state, postal_code, country, notes, is_active, created_by
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
      state,
      postal_code,
      country,
      notes,
      is_active,
      req.user?.id || null
    ];
    
    const result = await query(sql, values);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Error creating customer', error: err.message });
  }
};

/**
 * Update a customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      first_name, 
      last_name, 
      email, 
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      notes,
      is_active
    } = req.body;
    
    
    const checkResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    
    if (email) {
      const emailCheck = await query('SELECT * FROM customers WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A customer with this email already exists' });
      }
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
    }
    
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      values.push(city);
    }
    
    if (state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      values.push(state);
    }
    
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramCount++}`);
      values.push(postal_code);
    }
    
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(country);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (req.user?.id) {
      updates.push(`updated_by = $${paramCount++}`);
      values.push(req.user.id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const sql = `
      UPDATE customers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await query(sql, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ message: 'Error updating customer', error: err.message });
  }
};

/**
 * Delete a customer (can be soft delete or hard delete)
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    const checkResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    
    const ordersResult = await query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [id]);
    
    if (parseInt(ordersResult.rows[0].count) > 0) {
      
      await query(
        'UPDATE customers SET is_active = false, updated_at = NOW(), updated_by = $1 WHERE id = $2',
        [req.user?.id || null, id]
      );
      return res.json({ message: 'Customer deactivated due to existing orders' });
    }
    
    
    await query('DELETE FROM customers WHERE id = $1', [id]);
    
    res.json({ message: 'Customer deleted successfully' });
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