const { query } = require('../config/db');

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
      SELECT *
      FROM suppliers
      WHERE id = $1
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
 * Create a new supplier
 */
exports.createSupplier = async (req, res) => {
  try {
    const {
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
      is_active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const nameCheck = await query('SELECT * FROM suppliers WHERE name = $1', [name]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'A supplier with this name already exists' });
    }

    const sql = `
      INSERT INTO suppliers (
        name, contact_name, email, phone, address, city,
        state, postal_code, country, tax_id, website, notes,
        payment_terms, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
      req.user?.id || null
    ];

    const result = await query(sql, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).json({ message: 'Error creating supplier', error: err.message });
  }
};

/**
 * Update a supplier
 */
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
      is_active
    } = req.body;

    const checkResult = await query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (name) {
      const nameCheck = await query('SELECT * FROM suppliers WHERE name = $1 AND id != $2', [name, id]);
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'A supplier with this name already exists' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (contact_name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      values.push(contact_name);
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

    if (tax_id !== undefined) {
      updates.push(`tax_id = $${paramCount++}`);
      values.push(tax_id);
    }

    if (website !== undefined) {
      updates.push(`website = $${paramCount++}`);
      values.push(website);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    if (payment_terms !== undefined) {
      updates.push(`payment_terms = $${paramCount++}`);
      values.push(payment_terms);
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
      UPDATE suppliers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    values.push(id);

    const result = await query(sql, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).json({ message: 'Error updating supplier', error: err.message });
  }
};

/**
 * Delete a supplier (can be soft delete or hard delete)
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await query('SELECT * FROM suppliers WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const ordersResult = await query('SELECT COUNT(*) FROM supply_orders WHERE supplier_id = $1', [id]);

    if (parseInt(ordersResult.rows[0].count) > 0) {

      await query(
        'UPDATE suppliers SET is_active = false, updated_at = NOW(), updated_by = $1 WHERE id = $2',
        [req.user?.id || null, id]
      );
      return res.json({ message: 'Supplier deactivated due to existing orders' });
    }

    await query('DELETE FROM suppliers WHERE id = $1', [id]);

    res.json({ message: 'Supplier deleted successfully' });
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