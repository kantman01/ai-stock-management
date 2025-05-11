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
 * Complete a supplier order and add items to inventory
 */
exports.completeSupplierOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    if (!req.user || !req.user.role.permissions.includes('MANAGE_INVENTORY')) {
      return res.status(403).json({ message: 'You do not have permission to complete supplier orders' });
    }

    
    await query('BEGIN');

    try {
      
      const orderSql = `
        SELECT so.*, s.name as supplier_name
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.id
        WHERE so.id = $1
      `;
      const orderResult = await query(orderSql, [id]);

      if (orderResult.rows.length === 0) {
        throw new Error('Supplier order not found');
      }

      const order = orderResult.rows[0];

      if (order.status === 'completed') {
        throw new Error('This order has already been completed');
      }

      if (order.status === 'cancelled') {
        throw new Error('Cannot complete a cancelled order');
      }

      
      const itemsSql = `
        SELECT soi.*, p.name as product_name, p.stock_quantity as current_stock
        FROM supplier_order_items soi
        JOIN products p ON soi.product_id = p.id
        WHERE soi.supplier_order_id = $1
      `;
      const itemsResult = await query(itemsSql, [id]);

      if (itemsResult.rows.length === 0) {
        throw new Error('No items found in this order');
      }

      const orderItems = itemsResult.rows;

      
      for (const item of orderItems) {
        
        const adjustedItem = items?.find(i => i.id === item.id);
        const finalQuantity = adjustedItem?.quantity || item.quantity;

        if (finalQuantity <= 0) continue; 

        
        const updateProductSql = `
          UPDATE products
          SET stock_quantity = stock_quantity + $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING stock_quantity as new_stock, min_stock_quantity
        `;
        const updateResult = await query(updateProductSql, [finalQuantity, item.product_id]);
        const updatedProduct = updateResult.rows[0];

        // --- SUPPLIER STOCK DECREASE ---
        const supplierStockResult = await query(
          'SELECT stock_quantity FROM supplier_stock WHERE supplier_id = $1 AND product_id = $2 FOR UPDATE',
          [order.supplier_id, item.product_id]
        );
        if (supplierStockResult.rows.length === 0) {
          throw new Error(`Supplier stock not found for product ${item.product_id}`);
        }
        const supplierCurrentStock = parseInt(supplierStockResult.rows[0].stock_quantity);
        if (supplierCurrentStock < finalQuantity) {
          throw new Error(`Supplier does not have enough stock for product ${item.product_id}`);
        }
        await query(
          'UPDATE supplier_stock SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE supplier_id = $2 AND product_id = $3',
          [finalQuantity, order.supplier_id, item.product_id]
        );
        // --- END SUPPLIER STOCK DECREASE ---

        const movementSql = `
          INSERT INTO stock_movements (
            product_id, type, quantity, notes, created_by, 
            previous_quantity, new_quantity
          )
          VALUES ($1, 'receipt', $2, $3, $4, $5, $6)
        `;
        const movementValues = [
          item.product_id,
          finalQuantity,
          `Receipt from supplier order #${id}`,
          req.user.id,
          item.current_stock,
          updatedProduct.new_stock
        ];
        await query(movementSql, movementValues);

        
        if (adjustedItem && finalQuantity !== item.quantity) {
          const updateItemSql = `
            UPDATE supplier_order_items
            SET quantity = $1,
                total_price = unit_price * $1
            WHERE id = $2
          `;
          await query(updateItemSql, [finalQuantity, item.id]);
        }
      }

      
      const updateOrderSql = `
        UPDATE supplier_orders
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const updateOrderResult = await query(updateOrderSql, [id]);
      const completedOrder = updateOrderResult.rows[0];

      await query('COMMIT');

      res.json({
        message: 'Supplier order completed successfully',
        order: completedOrder
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (err) {
    console.error('Error completing supplier order:', err);
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