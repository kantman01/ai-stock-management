const { query } = require('../config/db');
const triggerNotifications = require('../utils/triggerNotifications');

/**
 * Get all stock movements with optional filtering
 */
exports.getStockMovements = async (req, res) => {
  try {
    const {
      product_id,
      type,
      start_date,
      end_date,
      search,
      sort_by = 'created_at',
      sort_dir = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT sm.*, 
        p.name as product_name, 
        u.first_name, 
        u.last_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (product_id) {
      sql += ` AND sm.product_id = $${params.length + 1}`;
      params.push(product_id);
    }

    if (type) {
      sql += ` AND sm.type = $${params.length + 1}`;
      params.push(type);
    }

    if (start_date) {
      sql += ` AND sm.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND sm.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (search) {
      sql += ` AND (p.name ILIKE $${params.length + 1} OR sm.notes ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    const countSql = sql.replace('SELECT sm.*, p.name as product_name, u.first_name, u.last_name', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY ${sort_by} ${sort_dir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ message: 'Error fetching stock movements', error: err.message });
  }
};

/**
 * Get a single stock movement by ID
 */
exports.getStockMovementById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT sm.*, 
        p.name as product_name, 
        u.first_name, 
        u.last_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.id = $1
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stock movement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stock movement:', err);
    res.status(500).json({ message: 'Error fetching stock movement', error: err.message });
  }
};

/**
 * Create a new stock movement
 */
exports.createStockMovement = async (req, res) => {
  try {
    const {
      product_id,
      quantity,
      type,
      notes
    } = req.body;

    if (!product_id || !quantity || !type) {
      return res.status(400).json({ message: 'Product ID, quantity, and movement type are required' });
    }

    const productResult = await query('SELECT * FROM products WHERE id = $1', [product_id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];
    const previousQuantity = product.stock_quantity;
    let newQuantity;

    if (type === 'receipt' || type === 'return_from_customer' || type === 'adjustment_add') {
      newQuantity = previousQuantity + parseInt(quantity);
    } else if (type === 'sale' || type === 'return_to_supplier' || type === 'waste' || type === 'adjustment_remove') {
      newQuantity = previousQuantity - parseInt(quantity);

      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Insufficient stock for this operation' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid movement type' });
    }

    await query('BEGIN');

    try {

      const movementSql = `
        INSERT INTO stock_movements (
          product_id, 
          quantity, 
          previous_quantity, 
          new_quantity, 
          type, 
          notes, 
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const movementResult = await query(movementSql, [
        product_id,
        quantity,
        previousQuantity,
        newQuantity,
        type,
        notes,
        req.user?.id || null
      ]);

      await query(
        'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, product_id]
      );

      
      if (['sale', 'return_to_supplier', 'waste', 'adjustment'].includes(type)) {
        
        const stockCheckSql = `
          SELECT p.id, p.name, p.sku, p.stock_quantity, p.min_stock_quantity
          FROM products p
          WHERE p.id = $1 AND p.stock_quantity <= p.min_stock_quantity
        `;
        
        const stockCheckResult = await query(stockCheckSql, [product_id]);
        
        
        if (stockCheckResult.rows.length > 0) {
          const product = stockCheckResult.rows[0];
          await triggerNotifications.lowStockNotification(product);
        }
      }

      await query('COMMIT');

      res.status(201).json(movementResult.rows[0]);
    } catch (err) {

      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating stock movement:', err);
    res.status(500).json({ message: 'Error creating stock movement', error: err.message });
  }
};

/**
 * Get products with their latest stock movements
 */
exports.getProductsWithMovements = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sql = `
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.stock_quantity, 
        p.min_stock_quantity,
        c.name as category_name,
        (
          SELECT json_build_object(
            'id', sm.id,
            'type', sm.type,
            'quantity', sm.quantity,
            'created_at', sm.created_at
          )
          FROM stock_movements sm
          WHERE sm.product_id = p.id
          ORDER BY sm.created_at DESC
          LIMIT 1
        ) as last_movement
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.updated_at DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products with movements:', err);
    res.status(500).json({ message: 'Error fetching products with movements', error: err.message });
  }
}; 