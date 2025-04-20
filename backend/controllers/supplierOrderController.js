const { query } = require('../config/db');
const triggerNotifications = require('../utils/triggerNotifications');

/**
 * Get all supplier orders with optional filtering
 */
exports.getSupplierOrders = async (req, res) => {
  try {
    const {
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
    let supplier_user_id = null;
    if(req.user.role.code.toLowerCase() === 'supplier'){
      supplier_user_id = req.user.id;
    }
    
    let sql = `
      SELECT so.*, s.name as supplier_name,
      (SELECT COUNT(*) FROM supplier_order_items WHERE supplier_order_id = so.id) as item_count,
      CASE 
        WHEN so.is_ai_created THEN true
        ELSE false
      END as is_ai_created,
      CASE 
        WHEN so.created_by IS NOT NULL THEN 
          (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = so.created_by)
        ELSE 
          CASE WHEN so.is_ai_created THEN 'AI System' ELSE 'System' END
      END as created_by_name
      FROM supplier_orders so
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (supplier_user_id) {
      sql += ` AND s.user_id = $${params.length + 1}`;
      params.push(supplier_user_id);
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
      SELECT so.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone,
      CASE 
        WHEN so.is_ai_created THEN true
        ELSE false
      END as is_ai_created,
      CASE 
        WHEN so.created_by IS NOT NULL THEN 
          (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = so.created_by)
        ELSE 
          CASE WHEN so.is_ai_created THEN 'AI System' ELSE 'System' END
      END as created_by_name
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
      console.log('total_amount', total_amount);
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

      console.log('orderId', orderId);
      console.log('order', order);
      
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
      return res.status(400).json({ message: 'Status is required' });
    }

    console.log(`[INFO] Updating supplier order #${id} status to: ${status}`);
    
    
    const currentOrderSql = `
      SELECT so.*, s.user_id as supplier_user_id, s.name as supplier_name
      FROM supplier_orders so
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      WHERE so.id = $1
    `;
    const currentOrderResult = await query(currentOrderSql, [id]);

    if (currentOrderResult.rows.length === 0) {
      console.log(`[ERROR] Supplier order #${id} not found`);
      return res.status(404).json({ message: 'Supplier order not found' });
    }

    const currentOrder = currentOrderResult.rows[0];
    const currentStatus = currentOrder.status.toLowerCase();
    const newStatus = status.toLowerCase();
    
    console.log(`[INFO] Order #${id} current status: ${currentStatus}, new status: ${newStatus}`);
    
    
    const isSupplier = req.user.role.code.toLowerCase() === 'supplier';
    const hasManageInventoryPermission = req.user.role.permissions.includes('MANAGE_INVENTORY');
    
    if (isSupplier) {
      
      if (currentOrder.supplier_user_id !== req.user.id) {
        console.log(`[ERROR] Supplier user #${req.user.id} not authorized to update order #${id}`);
        return res.status(403).json({ message: 'You are not authorized to update this order' });
      }
      
      
      const allowedSupplierStatusTransitions = {
        'pending': ['approved'],
        'approved': ['shipped'],
        'shipped': ['delivered'],
        'delivered': [], 
        'completed': [],
        'cancelled': []
      };
      
      if (!allowedSupplierStatusTransitions[currentStatus]?.includes(newStatus)) {
        console.log(`[ERROR] Cannot change order from "${currentStatus}" to "${newStatus}"`);
        return res.status(400).json({ 
          message: `Cannot change order from "${currentStatus}" to "${newStatus}"`,
          allowedTransitions: allowedSupplierStatusTransitions[currentStatus]
        });
      }
    } else if (!hasManageInventoryPermission) {
      console.log(`[ERROR] User lacks MANAGE_INVENTORY permission`);
      return res.status(403).json({ message: 'You do not have permission to update supplier order status' });
    }

    
    if (newStatus === 'completed' && currentStatus === 'delivered') {
      console.log(`[INFO] Order #${id} status is changing from 'delivered' to 'completed', will update inventory`);
      
      
      return exports.completeSupplierOrder(req, res);
    }
    
    
    const updateSql = `
      UPDATE supplier_orders 
      SET status = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3
      RETURNING *
    `;

    console.log(`[INFO] Executing standard status update to '${newStatus}'`);
    const updateResult = await query(updateSql, [newStatus, req.user.id, id]);
    console.log(`[INFO] Status update successful`);
    
    
    try {
      await triggerNotifications.supplierOrderStatusChange(updateResult.rows[0]);
    } catch (notifErr) {
      console.error('[ERROR] Error creating notification for status change:', notifErr);
      
    }

    
    const { getSupplierOrderById } = exports;
    return getSupplierOrderById(req, res);
  } catch (err) {
    console.error('[ERROR] Error updating supplier order status:', err);
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

    console.log(`[INFO] Starting completion process for supplier order ${id}`);

    await query('BEGIN');

    try {
      
      const checkResult = await query('SELECT * FROM supplier_orders WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        console.log(`[ERROR] Order ${id} not found`);
        return res.status(404).json({ message: 'Supplier order not found' });
      }

      const order = checkResult.rows[0];
      console.log(`[INFO] Found order ${id} with status: ${order.status}`);

      
      if (order.status !== 'delivered') {
        console.log(`[ERROR] Order ${id} has invalid status ${order.status} for completion`);
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
      console.log(`[INFO] Found ${orderItems.length} items for order ${id}`);

      if (orderItems.length === 0) {
        console.log(`[WARNING] Order ${id} has no items to process`);
      }

      
      for (const item of orderItems) {
        console.log(`[DEBUG] Processing product ID: ${item.product_id}, Name: ${item.name}`);
        
        
        const currentStockQuantity = parseInt(item.stock_quantity || 0);
        const addQuantity = parseInt(item.quantity || 0);
        const newStockQuantity = currentStockQuantity + addQuantity;

        console.log(`[DEBUG] Product ${item.product_id} (${item.name}): 
          Current stock: ${currentStockQuantity}, 
          Adding: ${addQuantity}, 
          New total: ${newStockQuantity}`);

        
        try {
          const updateSql = 'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING id, stock_quantity';
          console.log(`[DEBUG] Executing SQL: ${updateSql} with values [${newStockQuantity}, ${item.product_id}]`);
          
          const updateResult = await query(updateSql, [newStockQuantity, item.product_id]);
          
          if (updateResult.rows.length > 0) {
            console.log(`[DEBUG] Stock update successful for product ${item.product_id}. New stock: ${updateResult.rows[0].stock_quantity}`);
          } else {
            console.log(`[ERROR] No rows updated for product ${item.product_id}!`);
          }
        } catch (updateError) {
          console.error(`[ERROR] Failed to update stock for product ${item.product_id}:`, updateError);
          throw updateError;
        }

        
        try {
          const movementSql = `
            INSERT INTO stock_movements (
              product_id, 
              type, 
              quantity, 
              previous_quantity, 
              new_quantity, 
              notes, 
              reference_id, 
              reference_type, 
              created_by
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id
          `;
          
          const movementParams = [
            item.product_id,
            'purchase',
            addQuantity,
            currentStockQuantity,
            newStockQuantity,
            `Supplier Order #${id}`,
            id,
            'supplier_order',
            req.user?.id || null
          ];
          
          console.log(`[DEBUG] Creating stock movement for product ${item.product_id} with quantity ${addQuantity}`);
          
          const movementResult = await query(movementSql, movementParams);
          console.log(`[DEBUG] Created stock movement with ID: ${movementResult.rows[0]?.id}`);
        } catch (movementError) {
          console.error(`[ERROR] Failed to create stock movement for product ${item.product_id}:`, movementError);
          throw movementError;
        }
      }

      
      const updateOrderSql = `
        UPDATE supplier_orders 
        SET status = 'completed', updated_at = NOW(), updated_by = $1
        WHERE id = $2
        RETURNING *
      `;

      console.log(`[DEBUG] Updating order ${id} status to completed`);
      const result = await query(updateOrderSql, [req.user?.id || null, id]);
      console.log(`[INFO] Order ${id} marked as completed`);

      
      await query('COMMIT');
      console.log(`[INFO] Transaction committed for order ${id}`);

      
      try {
        const supplierQuery = `SELECT name FROM suppliers WHERE id = $1`;
        const supplierResult = await query(supplierQuery, [order.supplier_id]);
        const supplierName = supplierResult.rows[0]?.name || 'Unknown Supplier';
        
        await triggerNotifications.supplierOrderReceivedNotification(order, supplierName);
        console.log(`[INFO] Notification sent for order ${id} completion`);
      } catch (notifErr) {
        console.error('[ERROR] Error creating supplier order notification:', notifErr);
      }

      res.json(result.rows[0]);
    } catch (err) {
      
      await query('ROLLBACK');
      console.error(`[ERROR] Error in completion process, transaction rolled back:`, err);
      throw err;
    }
  } catch (err) {
    console.error('[ERROR] Error completing supplier order:', err);
    res.status(500).json({ message: 'Error completing supplier order', error: err.message });
  }
};

/**
 * Get a supplier order by ID that belongs to a specific supplier
 * This method is used for the supplier portal to ensure suppliers can only access their own orders
 */
exports.getSupplierOrderBySupplierId = async (orderId, supplierId) => {
  console.log("orderId",orderId);
  console.log("supplierId",supplierId);
  try {
    const sql = `
      SELECT 
        so.*,
        s.name as supplier_name,
        json_agg(json_build_object(
          'id', soi.id,
          'product_id', soi.product_id,
          'quantity', soi.quantity,
          'unit_price', soi.unit_price,
          'total_price', soi.total_price,
          'product_name', p.name,
          'product_sku', p.sku
        )) as items
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      LEFT JOIN supplier_order_items soi ON so.id = soi.supplier_order_id
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE so.id = $1 AND so.supplier_id = $2
      GROUP BY so.id, s.name
    `;

    const result = await query(sql, [orderId, supplierId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (err) {
    console.error('Error fetching supplier order by supplier ID:', err);
    throw err;
  }
};

/**
 * Update a supplier order's status by ID that belongs to a specific supplier
 * This method is used for the supplier portal to ensure suppliers can only update their own orders
 */
exports.updateSupplierOrderStatusBySupplierId = async (orderId, supplierId, status) => {
  try {
    
    const checkSql = `
      SELECT id FROM supplier_orders
      WHERE id = $1 AND supplier_id = $2
    `;

    const checkResult = await query(checkSql, [orderId, supplierId]);

    if (checkResult.rows.length === 0) {
      return null;
    }

    
    const updateSql = `
      UPDATE supplier_orders
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2 AND supplier_id = $3
      RETURNING *
    `;

    const updateResult = await query(updateSql, [status, orderId, supplierId]);

    if (updateResult.rows.length === 0) {
      return null;
    }

    
    return await exports.getSupplierOrderBySupplierId(orderId, supplierId);
  } catch (err) {
    console.error('Error updating supplier order status by supplier ID:', err);
    throw err;
  }
}; 