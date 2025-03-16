const { query } = require('../config/db');

/**
 * Get all products with optional filtering
 */
exports.getProducts = async (req, res) => {
  try {
    const { 
      category_id, 
      search, 
      min_stock, 
      max_stock,
      is_active,
      sort_by = 'name',
      sort_dir = 'ASC',
      limit = 100,
      offset = 0
    } = req.query;

    
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];
    
    
    if (category_id) {
      sql += ` AND p.category_id = $${params.length + 1}`;
      params.push(category_id);
    }
    
    if (search) {
      sql += ` AND (p.name ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    if (min_stock !== undefined) {
      sql += ` AND p.stock_quantity >= $${params.length + 1}`;
      params.push(min_stock);
    }
    
    if (max_stock !== undefined) {
      sql += ` AND p.stock_quantity <= $${params.length + 1}`;
      params.push(max_stock);
    }

    if (is_active !== undefined) {
      sql += ` AND p.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }
    
    
    sql += ` ORDER BY ${sort_by} ${sort_dir}`;
    
    
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    
    const countSql = sql.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*)');
    const countResult = await query(countSql.split('ORDER BY')[0], params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);
    
    
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
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
};

/**
 * Get a single product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Error fetching product', error: err.message });
  }
};

/**
 * Create a new product
 */
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      barcode, 
      sku, 
      category_id, 
      price, 
      cost_price, 
      tax_rate, 
      stock_quantity, 
      min_stock_quantity,
      reorder_quantity,
      image_url,
      is_active = true,
      weight,
      dimensions
    } = req.body;
    
    const sql = `
      INSERT INTO products (
        name, description, barcode, sku, category_id, price, cost_price,
        tax_rate, stock_quantity, min_stock_quantity, reorder_quantity,
        image_url, is_active, weight, dimensions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      name, 
      description, 
      barcode, 
      sku, 
      category_id, 
      price, 
      cost_price, 
      tax_rate || 0, 
      stock_quantity || 0, 
      min_stock_quantity || 0,
      reorder_quantity || 0,
      image_url,
      is_active,
      weight,
      dimensions
    ];
    
    const result = await query(sql, values);
    
    
    if (stock_quantity > 0) {
      const stockMovementSql = `
        INSERT INTO stock_movements (
          product_id, type, quantity, notes, created_by
        )
        VALUES ($1, 'receipt', $2, 'Initial stock', $3)
      `;
      
      await query(stockMovementSql, [
        result.rows[0].id,
        stock_quantity,
        req.user?.id || null
      ]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Error creating product', error: err.message });
  }
};

/**
 * Update a product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      barcode, 
      sku, 
      category_id, 
      price, 
      cost_price, 
      tax_rate, 
      min_stock_quantity,
      reorder_quantity,
      image_url,
      is_active,
      weight,
      dimensions
    } = req.body;
    
    
    const checkResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (barcode !== undefined) {
      updates.push(`barcode = $${paramCount++}`);
      values.push(barcode);
    }
    
    if (sku !== undefined) {
      updates.push(`sku = $${paramCount++}`);
      values.push(sku);
    }
    
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramCount++}`);
      values.push(category_id);
    }
    
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    
    if (cost_price !== undefined) {
      updates.push(`cost_price = $${paramCount++}`);
      values.push(cost_price);
    }
    
    if (tax_rate !== undefined) {
      updates.push(`tax_rate = $${paramCount++}`);
      values.push(tax_rate);
    }
    
    if (min_stock_quantity !== undefined) {
      updates.push(`min_stock_quantity = $${paramCount++}`);
      values.push(min_stock_quantity);
    }
    
    if (reorder_quantity !== undefined) {
      updates.push(`reorder_quantity = $${paramCount++}`);
      values.push(reorder_quantity);
    }
    
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    
    if (weight !== undefined) {
      updates.push(`weight = $${paramCount++}`);
      values.push(weight);
    }
    
    if (dimensions !== undefined) {
      updates.push(`dimensions = $${paramCount++}`);
      values.push(dimensions);
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const sql = `
      UPDATE products 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await query(sql, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
};

/**
 * Delete a product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    const checkResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    
    const relatedRecords = await query(
      'SELECT COUNT(*) FROM order_items WHERE product_id = $1 UNION ALL ' +
      'SELECT COUNT(*) FROM stock_movements WHERE product_id = $1',
      [id]
    );
    
    const hasRelatedRecords = relatedRecords.rows.some(row => parseInt(row.count) > 0);
    
    if (hasRelatedRecords) {
      
      await query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
      return res.json({ message: 'Product marked as inactive due to existing relations' });
    }
    
    
    await query('DELETE FROM products WHERE id = $1', [id]);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Error deleting product', error: err.message });
  }
};

/**
 * Update product stock
 */
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      quantity, 
      movement_type, 
      notes 
    } = req.body;
    
    if (!quantity || !movement_type) {
      return res.status(400).json({ message: 'Quantity and movement type are required' });
    }
    
    
    const checkResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = checkResult.rows[0];
    
    
    await query('BEGIN');
    
    try {
      
      await query(
        'INSERT INTO stock_movements (product_id, type, quantity, notes, created_by) VALUES ($1, $2, $3, $4, $5)',
        [id, movement_type, quantity, notes, req.user?.id || null]
      );
      
      
      let newQuantity = product.stock_quantity;
      
      if (['receipt', 'return_from_customer', 'adjustment'].includes(movement_type)) {
        newQuantity += parseInt(quantity);
      } else if (['sale', 'return_to_supplier', 'waste'].includes(movement_type)) {
        newQuantity -= parseInt(quantity);
      }
      
      
      if (newQuantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }
      
      
      const updateResult = await query(
        'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newQuantity, id]
      );
      
      
      await query('COMMIT');
      
      res.json(updateResult.rows[0]);
    } catch (err) {
      
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ message: 'Error updating stock', error: err.message });
  }
};

/**
 * Get stock movement history for a product
 */
exports.getStockMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    
    const checkResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const sql = `
      SELECT sm.*, u.first_name, u.last_name
      FROM stock_movements sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await query(sql, [id, limit, offset]);
    
    
    const countResult = await query(
      'SELECT COUNT(*) FROM stock_movements WHERE product_id = $1',
      [id]
    );
    
    const total = parseInt(countResult.rows[0].count);
    
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
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ message: 'Error fetching stock movements', error: err.message });
  }
}; 