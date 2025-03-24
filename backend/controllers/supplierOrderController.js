const { query } = require('../config/db');

/**
 * Get all supplier orders with optional filtering
 */
exports.getSupplierOrders = async (req, res) => {
  try {
    const {
      supplier_id,
      status,
      start_date,
      end_date,
      min_total,
      max_total,
      sort_by = 'created_at',
      sort_dir = 'DESC',
      limit = 50,
      offset = 0,
      search
    } = req.query;

    let sql = `
      SELECT so.*, s.name as supplier_name,
      (SELECT COUNT(*) FROM supplier_order_items WHERE supplier_order_id = so.id) as item_count
      FROM supplier_orders so
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (supplier_id) {
      sql += ` AND so.supplier_id = $${params.length + 1}`;
      params.push(supplier_id);
    }

    if (status) {
      sql += ` AND so.status = $${params.length + 1}`;
      params.push(status);
    }

    if (start_date) {
      sql += ` AND so.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND so.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (min_total !== undefined) {
      sql += ` AND so.total_amount >= $${params.length + 1}`;
      params.push(min_total);
    }

    if (max_total !== undefined) {
      sql += ` AND so.total_amount <= $${params.length + 1}`;
      params.push(max_total);
    }

    if (search) {
      sql += ` AND (s.name ILIKE $${params.length + 1} OR so.id::text ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countSql.split('ORDER BY')[0], params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    sql += ` ORDER BY ${sort_by} ${sort_dir}`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

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
    console.error('Error fetching supplier orders:', err);
    res.status(500).json({ message: 'Error fetching supplier orders', error: err.message });
  }
};

/**
 * Get a single supplier order by ID with its items
 */
exports.getSupplierOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderSql = `
      SELECT so.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone
      FROM supplier_orders so
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      WHERE so.id = $1
    `;

    const orderResult = await query(orderSql, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier order not found' });
    }

    const order = orderResult.rows[0];

    const itemsSql = `
      SELECT soi.id, soi.product_id, soi.supplier_order_id, soi.quantity, soi.unit_price, 
        soi.total_price, p.name as product_name, p.sku, p.barcode
      FROM supplier_order_items soi
      JOIN products p ON soi.product_id = p.id
      WHERE soi.supplier_order_id = $1
    `;

    const itemsResult = await query(itemsSql, [id]);

    order.items = itemsResult.rows;

    res.json(order);
  } catch (err) {
    console.error('Error fetching supplier order:', err);
    res.status(500).json({ message: 'Error fetching supplier order', error: err.message });
  }
};

/**
 * Create a new supplier order
 */
exports.createSupplierOrder = async (req, res) => {
  try {
    const {
      supplier_id,
      items,
      notes,
      status = 'pending'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    await query('BEGIN');

    try {
      let total_amount = 0;

      const productDetailsPromises = items.map(item =>
        query('SELECT id, name, price FROM products WHERE id = $1', [item.product_id])
      );

      const productDetailsResults = await Promise.all(productDetailsPromises);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productResult = productDetailsResults[i];

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        const product = productResult.rows[0];
        const itemTotal = parseFloat(product.price) * item.quantity;
        total_amount += itemTotal;
      }

      const orderSql = `
        INSERT INTO supplier_orders (
          supplier_id, status, total_amount, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const orderValues = [
        supplier_id,
        status,
        total_amount,
        notes,
        req.user?.id || null
      ];

      const orderResult = await query(orderSql, orderValues);
      const order = orderResult.rows[0];
      const orderId = order.id;

      const itemsPromises = items.map((item, index) => {
        const productResult = productDetailsResults[index];
        const product = productResult.rows[0];

        const unit_price = parseFloat(product.price);
        const total_price = unit_price * item.quantity;

        return query(
          'INSERT INTO supplier_order_items (supplier_order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.product_id, item.quantity, unit_price, total_price]
        );
      });

      await Promise.all(itemsPromises);

      await query('COMMIT');

      const { id } = order;
      const getOrderResult = await exports.getSupplierOrderById({ params: { id } }, res);
      return getOrderResult;
    } catch (err) {

      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating supplier order:', err);
    res.status(500).json({ message: 'Error creating supplier order', error: err.message });
  }
};

/**
 * Update a supplier order's status
 */
exports.updateSupplierOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'No status update provided' });
    }

    const checkResult = await query('SELECT * FROM supplier_orders WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier order not found' });
    }

    const sql = `
      UPDATE supplier_orders 
      SET status = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(sql, [status, req.user?.id || null, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating supplier order status:', err);
    res.status(500).json({ message: 'Error updating supplier order status', error: err.message });
  }
};

/**
 * Delete a supplier order (cancel)
 */
exports.deleteSupplierOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await query('SELECT * FROM supplier_orders WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supplier order not found' });
    }

    const sql = `
      UPDATE supplier_orders 
      SET status = 'cancelled', updated_at = NOW(), updated_by = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(sql, [req.user?.id || null, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error cancelling supplier order:', err);
    res.status(500).json({ message: 'Error cancelling supplier order', error: err.message });
  }
};

/**
 * Complete a supplier order (add items to inventory)
 */
exports.completeSupplierOrder = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[DEBUG] Starting completion process for supplier order ${id}`);

    await query('BEGIN');

    try {

      const checkResult = await query('SELECT * FROM supplier_orders WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        console.log(`[DEBUG] Order ${id} not found`);
        return res.status(404).json({ message: 'Supplier order not found' });
      }

      const order = checkResult.rows[0];
      console.log(`[DEBUG] Found order ${id} with status: ${order.status}`);

      if (order.status !== 'delivered') {
        console.log(`[DEBUG] Order ${id} has invalid status ${order.status} for completion`);
        return res.status(400).json({
          message: 'Order must be in delivered status to complete'
        });
      }

      const orderItemsResult = await query(`
        SELECT soi.product_id, soi.quantity, p.stock_quantity, p.name
        FROM supplier_order_items soi
        JOIN products p ON soi.product_id = p.id
        WHERE soi.supplier_order_id = $1
      `, [id]);

      const orderItems = orderItemsResult.rows;
      console.log(`[DEBUG] Found ${orderItems.length} items for order ${id}`);

      for (const item of orderItems) {
        const currentStockQuantity = parseInt(item.stock_quantity);
        const addQuantity = parseInt(item.quantity);
        const newStockQuantity = currentStockQuantity + addQuantity;

        console.log(`[DEBUG] Processing product ${item.product_id} (${item.name}): 
          Current stock: ${currentStockQuantity}, 
          Adding: ${addQuantity}, 
          New total: ${newStockQuantity}`);

        const updateResult = await query(
          'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING stock_quantity',
          [newStockQuantity, item.product_id]
        );

        console.log(`[DEBUG] Stock update result: `, updateResult.rows[0]);

        const movementResult = await query(
          'INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, notes, reference_id, reference_type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
          [
            item.product_id,
            'purchase',
            addQuantity,
            currentStockQuantity,
            newStockQuantity,
            `Supplier Order #${id}`,
            id,
            'supplier_order',
            req.user?.id || null
          ]
        );

        console.log(`[DEBUG] Created stock movement with ID: ${movementResult.rows[0].id}`);
      }

      const sql = `
        UPDATE supplier_orders 
        SET status = 'completed', updated_at = NOW(), updated_by = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await query(sql, [req.user?.id || null, id]);
      console.log(`[DEBUG] Order ${id} marked as completed`);

      await query('COMMIT');
      console.log(`[DEBUG] Transaction committed for order ${id}`);

      res.json(result.rows[0]);
    } catch (err) {
      await query('ROLLBACK');
      console.error(`[DEBUG] Error in completion process, transaction rolled back: `, err);
      throw err;
    }
  } catch (err) {
    console.error('Error completing supplier order:', err);
    res.status(500).json({ message: 'Error completing supplier order', error: err.message });
  }
}; 