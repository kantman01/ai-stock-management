const { query } = require('../config/db');

/**
 * Get all orders with optional filtering
 */
exports.getOrders = async (req, res) => {
  try {
    const {
      customer_id,
      status,
      start_date,
      end_date,
      min_total,
      max_total,
      sort_by = 'created_at',
      sort_dir = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT o.*, c.first_name || ' ' || c.last_name as customer_name,
      u.first_name || ' ' || u.last_name as created_by_name,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;

    const params = [];

    if (customer_id) {
      sql += ` AND o.customer_id = $${params.length + 1}`;
      params.push(customer_id);
    }

    if (status) {
      sql += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }

    if (start_date) {
      sql += ` AND o.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND o.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (min_total !== undefined) {
      sql += ` AND o.total_amount >= $${params.length + 1}`;
      params.push(min_total);
    }

    if (max_total !== undefined) {
      sql += ` AND o.total_amount <= $${params.length + 1}`;
      params.push(max_total);
    }

    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await query(countSql.split('ORDER BY')[0], params);
    const total = parseInt(countResult.rows[0].count);

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
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Error fetching orders', error: err.message });
  }
};

/**
 * Get a single order by ID with its items
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderSql = `
      SELECT o.*, 
      c.first_name || ' ' || c.last_name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      u.first_name || ' ' || u.last_name as created_by_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1
    `;

    const orderResult = await query(orderSql, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const itemsSql = `
      SELECT oi.id, oi.product_id, oi.order_id, oi.quantity,
        p.name as product_name, p.sku, p.barcode, 
        CAST(oi.unit_price AS numeric) as unit_price, 
        CAST(oi.tax_rate AS numeric) as tax_rate, 
        CAST(oi.tax_amount AS numeric) as tax_amount, 
        CAST(oi.total_price AS numeric) as total_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;

    const itemsResult = await query(itemsSql, [id]);

    order.items = itemsResult.rows.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      tax_rate: parseFloat(item.tax_rate),
      tax_amount: parseFloat(item.tax_amount),
      total_price: parseFloat(item.total_price)
    }));

    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Error fetching order', error: err.message });
  }
};

/**
 * Create a new order
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      customer_id,
      items,
      notes,
      status = 'pending',
      payment_status = 'unpaid'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    await query('BEGIN');

    try {

      let subTotal = 0;
      let taxTotal = 0;

      const productDetailsPromises = items.map(item =>
        query('SELECT id, name, price, tax_rate, stock_quantity FROM products WHERE id = $1', [item.product_id])
      );

      const productDetailsResults = await Promise.all(productDetailsPromises);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productResult = productDetailsResults[i];

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        const product = productResult.rows[0];

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Not enough stock for product ${product.name}`);
        }

        const itemPrice = parseFloat(product.price) * item.quantity;
        const itemTax = itemPrice * (parseFloat(product.tax_rate) / 100);

        subTotal += itemPrice;
        taxTotal += itemTax;
      }

      const totalAmount = subTotal + taxTotal;

      const orderSql = `
        INSERT INTO orders (
          customer_id, status, payment_status, subtotal, tax_total, total_amount, 
          notes, created_by, order_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const orderValues = [
        customer_id,
        status,
        payment_status,
        subTotal,
        taxTotal,
        totalAmount,
        notes,
        req.user?.id || null,
        customer_id + '-' + new Date().toISOString().replace(/[-:Z]/g, '').substring(0, 15)
      ];

      const orderResult = await query(orderSql, orderValues);
      const order = orderResult.rows[0];
      const orderId = order.id;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productResult = productDetailsResults[i];
        const product = productResult.rows[0];

        const currentStockQuantity = product.stock_quantity;
        const newStockQuantity = currentStockQuantity - item.quantity;

        await query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );

        await query(
          'INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.product_id, 'sale', item.quantity, currentStockQuantity, newStockQuantity, `Order #${orderId}`, req.user?.id || null]
        );
      }

      const itemsPromises = items.map((item, index) => {
        const productResult = productDetailsResults[index];
        const product = productResult.rows[0] || { price: 0, tax_rate: 0 };

        const unit_price = parseFloat(product.price || 0);
        const tax_rate = parseFloat(product.tax_rate || 0);

        const total_price = unit_price * item.quantity;
        const tax_amount = total_price * (tax_rate / 100);

        console.log('Order item details:', {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price,
          tax_rate,
          tax_amount,
          total_price,
          product_found: !!productResult.rows[0]
        });

        return query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, tax_rate, tax_amount, total_price) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [orderId, item.product_id, item.quantity, unit_price, tax_rate, tax_amount, total_price]
        );
      });

      await Promise.all(itemsPromises);

      await query('COMMIT');

      const { id } = order;
      const getOrderResult = await exports.getOrderById({ params: { id } }, res);
      return getOrderResult;
    } catch (err) {

      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
};

/**
 * Update an order's status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    if (!status && !payment_status) {
      return res.status(400).json({ message: 'No status updates provided' });
    }

    const checkResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (payment_status) {
      updates.push(`payment_status = $${paramCount++}`);
      values.push(payment_status);
    }

    updates.push(`updated_at = NOW()`);

    if (req.user?.id) {
      updates.push(`updated_by = $${paramCount++}`);
      values.push(req.user.id);
    }

    const sql = `
      UPDATE orders 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    values.push(id);

    const result = await query(sql, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Error updating order status', error: err.message });
  }
};

/**
 * Delete an order (soft delete - mark as cancelled)
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await query('BEGIN');

    try {

      const checkResult = await query('SELECT * FROM orders WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const order = checkResult.rows[0];

      if (order.status !== 'cancelled') {

        const orderItemsResult = await query(`
          SELECT oi.product_id, oi.quantity, p.stock_quantity 
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `, [id]);

        const orderItems = orderItemsResult.rows;
        console.log(orderItems);

        for (const item of orderItems) {
          const currentStockQuantity = item.stock_quantity;
          const returnQuantity = item.quantity;
          const newStockQuantity = currentStockQuantity + returnQuantity;
          console.log(item);

          console.log(item.product_id, returnQuantity, currentStockQuantity, newStockQuantity);
          await query(
            'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2',
            [returnQuantity, item.product_id]
          );

          await query(
            'INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, notes, reference_id, reference_type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
              item.product_id,
              'return_from_customer',
              returnQuantity,
              currentStockQuantity,
              newStockQuantity,
              `Cancelled Order #${id}`,
              id,
              'order',
              req.user?.id || null
            ]
          );
        }
      }

      const sql = `
        UPDATE orders 
        SET status = 'cancelled', updated_at = NOW(), updated_by = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await query(sql, [req.user?.id || null, id]);

      await query('COMMIT');

      res.json(result.rows[0]);
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ message: 'Error cancelling order', error: err.message });
  }
}; 