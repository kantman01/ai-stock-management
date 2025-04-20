const { query } = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Get all suppliers with optional filtering
 */
exports.getSuppliers = async (req, res) => {
  try {
    const {
      search,
      is_active,
      sort_by = 'name',
      sort_dir = 'ASC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT s.* 
      FROM suppliers s
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      sql += ` AND (s.name ILIKE $${params.length + 1} OR s.contact_name ILIKE $${params.length + 1} OR s.email ILIKE $${params.length + 1} OR s.phone ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      sql += ` AND s.is_active = $${params.length + 1}`;
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
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ message: 'Error fetching suppliers', error: err.message });
  }
};

/**
 * Get a single supplier by ID with their supply order history
 */
exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT s.*, u.email as user_email, u.first_name, u.last_name, u.is_active as user_is_active
      FROM suppliers s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;

    const supplierResult = await query(sql, [id]);

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const supplier = supplierResult.rows[0];

    const productsSql = `
      SELECT p.id, p.name, p.sku, p.price, p.stock_quantity
      FROM products p
      JOIN product_suppliers ps ON p.id = ps.product_id
      WHERE ps.supplier_id = $1
      ORDER BY p.name
      LIMIT 10
    `;

    const productsResult = await query(productsSql, [id]);

    supplier.supplied_products = productsResult.rows;

    supplier.recent_orders = [];

    res.json(supplier);
  } catch (err) {
    console.error('Error fetching supplier:', err);
    res.status(500).json({ message: 'Error fetching supplier', error: err.message });
  }
};

/**
 * Create a new supplier with a user account
 */
exports.createSupplier = async (req, res) => {
  try {
    const {
      name,
      contact_name,
      email,
      password,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      tax_id,
      website,
      notes,
      payment_terms,
      is_active = true
    } = req.body;

    
    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required for the supplier account' });
    }

    
    const nameCheck = await query('SELECT * FROM suppliers WHERE name = $1', [name]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'A supplier with this name already exists' });
    }

    
    const emailCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    
    await query('BEGIN');

    try {
      
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      
      const roleResult = await query('SELECT id FROM roles WHERE code = $1', ['supplier']);
      if (roleResult.rows.length === 0) {
        throw new Error('Supplier role not found');
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
        contact_name.split(' ')[0] || '', 
        contact_name.split(' ').slice(1).join(' ') || '', 
        roleId,
        is_active
      ]);

      const userId = userResult.rows[0].id;

      
      const supplierSql = `
        INSERT INTO suppliers (
          name, contact_name, email, phone, address, city,
          state, postal_code, country, tax_id, website, notes,
          payment_terms, is_active, created_by, user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const values = [
        name,
        contact_name,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        tax_id,
        website,
        notes,
        payment_terms,
        is_active,
        req.user?.id || null,
        userId
      ];

      const supplierResult = await query(supplierSql, values);
      const supplier = supplierResult.rows[0];

      
      await query('COMMIT');

      
      res.status(201).json({
        ...supplier,
        user: {
          id: userId,
          email,
          first_name: contact_name.split(' ')[0] || '',
          last_name: contact_name.split(' ').slice(1).join(' ') || '',
          is_active
        }
      });
    } catch (error) {
      
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).json({ message: 'Error creating supplier', error: err.message });
  }
};

/**
 * Update a supplier and associated user
 */
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contact_name,
      email,
      password, 
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      tax_id,
      website,
      notes,
      payment_terms,
      is_active
    } = req.body;

    
    const checkResult = await query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const supplier = checkResult.rows[0];
    const userId = supplier.user_id;

    
    if (name && name !== supplier.name) {
      const nameCheck = await query('SELECT * FROM suppliers WHERE name = $1 AND id != $2', [name, id]);
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A supplier with this name already exists' });
      }
    }

    
    if (email && email !== supplier.email) {
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

        if (contact_name !== undefined) {
          userUpdates.push(`first_name = $${userParamCount++}`);
          userValues.push(contact_name.split(' ')[0] || '');

          userUpdates.push(`last_name = $${userParamCount++}`);
          userValues.push(contact_name.split(' ').slice(1).join(' ') || '');
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

      
      const supplierUpdates = [];
      const supplierValues = [];
      let supplierParamCount = 1;

      if (name !== undefined) {
        supplierUpdates.push(`name = $${supplierParamCount++}`);
        supplierValues.push(name);
      }

      if (contact_name !== undefined) {
        supplierUpdates.push(`contact_name = $${supplierParamCount++}`);
        supplierValues.push(contact_name);
      }

      if (email !== undefined) {
        supplierUpdates.push(`email = $${supplierParamCount++}`);
        supplierValues.push(email);
      }

      if (phone !== undefined) {
        supplierUpdates.push(`phone = $${supplierParamCount++}`);
        supplierValues.push(phone);
      }

      if (address !== undefined) {
        supplierUpdates.push(`address = $${supplierParamCount++}`);
        supplierValues.push(address);
      }

      if (city !== undefined) {
        supplierUpdates.push(`city = $${supplierParamCount++}`);
        supplierValues.push(city);
      }

      if (state !== undefined) {
        supplierUpdates.push(`state = $${supplierParamCount++}`);
        supplierValues.push(state);
      }

      if (postal_code !== undefined) {
        supplierUpdates.push(`postal_code = $${supplierParamCount++}`);
        supplierValues.push(postal_code);
      }

      if (country !== undefined) {
        supplierUpdates.push(`country = $${supplierParamCount++}`);
        supplierValues.push(country);
      }

      if (tax_id !== undefined) {
        supplierUpdates.push(`tax_id = $${supplierParamCount++}`);
        supplierValues.push(tax_id);
      }

      if (website !== undefined) {
        supplierUpdates.push(`website = $${supplierParamCount++}`);
        supplierValues.push(website);
      }

      if (notes !== undefined) {
        supplierUpdates.push(`notes = $${supplierParamCount++}`);
        supplierValues.push(notes);
      }

      if (payment_terms !== undefined) {
        supplierUpdates.push(`payment_terms = $${supplierParamCount++}`);
        supplierValues.push(payment_terms);
      }

      if (is_active !== undefined) {
        supplierUpdates.push(`is_active = $${supplierParamCount++}`);
        supplierValues.push(is_active);
      }

      supplierUpdates.push(`updated_at = NOW()`);

      if (req.user?.id) {
        supplierUpdates.push(`updated_by = $${supplierParamCount++}`);
        supplierValues.push(req.user.id);
      }

      if (supplierUpdates.length > 0) {
        const sql = `
          UPDATE suppliers
          SET ${supplierUpdates.join(', ')}
          WHERE id = $${supplierParamCount}
          RETURNING *
        `;

        supplierValues.push(id);
        const result = await query(sql, supplierValues);
        
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
    console.error('Error updating supplier:', err);
    res.status(500).json({ message: 'Error updating supplier', error: err.message });
  }
};

/**
 * Delete a supplier and optionally deactivate associated user
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteUser = false } = req.body; 

    
    const checkResult = await query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const userId = checkResult.rows[0].user_id;

    const ordersResult = await query('SELECT COUNT(*) FROM supply_orders WHERE supplier_id = $1', [id]);
    const hasOrders = parseInt(ordersResult.rows[0].count) > 0;

    await query('BEGIN');

    try {
      
      if (hasOrders) {
        
        await query(
          'UPDATE suppliers SET is_active = false, updated_at = NOW(), updated_by = $1 WHERE id = $2',
          [req.user?.id || null, id]
        );

        
        if (userId) {
          await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
        }

        await query('COMMIT');
        return res.json({ message: 'Supplier deactivated due to existing orders' });
      }

      
      await query('DELETE FROM suppliers WHERE id = $1', [id]);

      
      if (userId) {
        if (deleteUser) {
          
          const otherAssociationsCheck = await query(
            'SELECT 1 FROM customers WHERE user_id = $1 LIMIT 1',
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
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error deleting supplier:', err);
    res.status(500).json({ message: 'Error deleting supplier', error: err.message });
  }
};

/**
 * Get supplier products
 */
exports.getSupplierProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const checkResult = await query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const productsSql = `
      SELECT DISTINCT ON (p.id) p.*, c.name as category_name,
      (SELECT MAX(soi.unit_price) FROM supply_order_items soi 
       JOIN supply_orders so ON soi.order_id = so.id 
       WHERE so.supplier_id = $1 AND soi.product_id = p.id) as last_purchase_price,
      (SELECT MAX(so.created_at) FROM supply_order_items soi 
       JOIN supply_orders so ON soi.order_id = so.id 
       WHERE so.supplier_id = $1 AND soi.product_id = p.id) as last_purchase_date
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      JOIN supply_order_items soi ON p.id = soi.product_id
      JOIN supply_orders so ON soi.order_id = so.id
      WHERE so.supplier_id = $1
      ORDER BY p.id, p.name
      LIMIT $2 OFFSET $3
    `;

    const productsResult = await query(productsSql, [id, limit, offset]);

    const countSql = `
      SELECT COUNT(DISTINCT p.id) 
      FROM products p
      JOIN supply_order_items soi ON p.id = soi.product_id
      JOIN supply_orders so ON soi.order_id = so.id
      WHERE so.supplier_id = $1
    `;

    const countResult = await query(countSql, [id]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: productsResult.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching supplier products:', err);
    res.status(500).json({ message: 'Error fetching supplier products', error: err.message });
  }
}; 