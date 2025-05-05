const { query } = require('../config/db');
const triggerNotifications = require('../utils/triggerNotifications');
const path = require('path');
const fs = require('fs');

/**
 * Get all products with optional filtering
 */
exports.getProducts = async (req, res) => {
  try {
    const {
      category_id,
      search,
      in_stock,
      min_stock,
      max_stock,
      supplier_id,
      sort_by = 'name',
      sort_dir = 'ASC',
      limit = 50,
      offset = 0,
      show_all_supplier_products = false,
      has_been_ordered = false
    } = req.query;

    const isSupplier = req.user && req.user.role && req.user.role.code === 'supplier';
    const isAdmin = req.user && req.user.role && (req.user.role.code === 'admin' || req.user.role.code === 'warehouse');
    const isCustomer = req.user && req.user.role && req.user.role.code === 'customer';
    let supplierIdFromUser = null;
    if (isSupplier && req.user.id) {
      if (req.user.supplierId) {
        supplierIdFromUser = req.user.supplierId;
      } else {
        const supplierResult = await query('SELECT id FROM suppliers WHERE user_id = $1', [req.user.id]);
        if (supplierResult.rows.length > 0) {
          supplierIdFromUser = supplierResult.rows[0].id;
        } else {
          return res.status(400).json({ message: 'Supplier information not found for this user.' });
        }
      }
    }

    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
    `;

    
    if (isSupplier && supplierIdFromUser) {
      sql += `,
        COALESCE(ss.stock_quantity, 0) as supplier_stock_quantity,
        COALESCE(ss.min_stock_quantity, p.min_stock_quantity) as supplier_min_stock_quantity
      `;
    }

    sql += `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;

    
    if (isSupplier && supplierIdFromUser) {
      sql += `
        LEFT JOIN supplier_stock ss ON p.id = ss.product_id AND ss.supplier_id = ${supplierIdFromUser}
      `;
    }

    sql += ` WHERE 1=1 AND p.is_active = true`;

    const params = [];

    if (isSupplier && supplierIdFromUser) {
      sql += ` AND p.supplier_id = $${params.length + 1}`;
      params.push(supplierIdFromUser);
    } else if (isAdmin && !show_all_supplier_products) {
      
      sql += ` AND (
        EXISTS (
          SELECT 1 FROM supplier_order_items soi
          JOIN supplier_orders so ON soi.supplier_order_id = so.id
          WHERE soi.product_id = p.id AND so.status = 'completed'
        )
      )`;
    }

    
    if (isCustomer) {
      
      sql += ` AND p.stock_quantity > 0`;
    }
    
    
    if (has_been_ordered === 'true') {
      sql += ` AND (
        EXISTS (
          SELECT 1 FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.product_id = p.id
        )
      )`;
    }

    if (category_id) {
      sql += ` AND p.category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    if (search) {
      sql += ` AND (
        p.name ILIKE $${params.length + 1} OR
        p.sku ILIKE $${params.length + 1} OR
        p.barcode ILIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    if (in_stock === 'true') {
      
      if (isSupplier) {
        sql += ` AND COALESCE(ss.stock_quantity, 0) > 0`;
      } else {
        sql += ` AND p.stock_quantity > 0`;
      }
    }

    if (min_stock !== undefined) {
      if (isSupplier) {
        sql += ` AND COALESCE(ss.stock_quantity, 0) >= $${params.length + 1}`;
      } else {
        sql += ` AND p.stock_quantity >= $${params.length + 1}`;
      }
      params.push(min_stock);
    }

    if (max_stock !== undefined) {
      if (isSupplier) {
        sql += ` AND COALESCE(ss.stock_quantity, 0) <= $${params.length + 1}`;
      } else {
        sql += ` AND p.stock_quantity <= $${params.length + 1}`;
      }
      params.push(max_stock);
    }

    if (supplier_id) {
      sql += ` AND p.supplier_id = $${params.length + 1}`;
      params.push(supplier_id);
    }

    
    
    let countSelect = "p.*, c.name as category_name, s.name as supplier_name";
    if (isSupplier && supplierIdFromUser) {
      countSelect += ", COALESCE(ss.stock_quantity, 0) as supplier_stock_quantity, COALESCE(ss.min_stock_quantity, 0) as supplier_min_stock_quantity";
    }
    const countSql = sql.replace(countSelect, "COUNT(*)");
    const countResult = await query(countSql, params);
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
    const isSupplier = req.user && req.user.role && req.user.role.code === 'supplier';
    
    
    let supplierIdFromUser = null;
    if (isSupplier && req.user.id) {
      if (req.user.supplierId) {
        
        supplierIdFromUser = req.user.supplierId;
      } else {
        
        const supplierResult = await query('SELECT id FROM suppliers WHERE user_id = $1', [req.user.id]);
        if (supplierResult.rows.length > 0) {
          supplierIdFromUser = supplierResult.rows[0].id;
        }
      }
    }

    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
    `;
    
    
    if (isSupplier && supplierIdFromUser) {
      sql += `,
        COALESCE(ss.stock_quantity, 0) as supplier_stock_quantity,
        COALESCE(ss.min_stock_quantity, p.min_stock_quantity) as supplier_min_stock_quantity
      `;
    }
    
    sql += `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;
    
    
    if (isSupplier && supplierIdFromUser) {
      sql += `
        LEFT JOIN supplier_stock ss ON p.id = ss.product_id AND ss.supplier_id = ${supplierIdFromUser}
      `;
    }
    
    sql += ` WHERE p.id = $1 and p.is_active = true`;

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
      supplier_id,
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

    
    if (!sku) {
      return res.status(400).json({ message: 'SKU is a required field.' });
    }

    
    const existingSku = await query('SELECT id FROM products WHERE sku = $1 and is_active = true', [sku]);
    if (existingSku.rows.length > 0) {
      return res.status(400).json({ message: 'This SKU is already in use. Please enter a unique SKU.' });
    }

    
    let productSupplierId = null;
    const isSupplier = req.user && req.user.role && req.user.role.code === 'supplier';
    
    if (isSupplier) {
      
      if (!req.user.supplierId && req.user.id) {
        const supplierResult = await query('SELECT id FROM suppliers WHERE user_id = $1', [req.user.id]);
        if (supplierResult.rows.length > 0) {
          productSupplierId = supplierResult.rows[0].id;
        }
      } else if (req.user.supplierId) {
        productSupplierId = req.user.supplierId;
      }
      
      if (!productSupplierId) {
        return res.status(400).json({ message: 'Supplier information not found for this user.' });
      }
    } else {
      
      productSupplierId = supplier_id || null;
      
      if (!productSupplierId && req.user.role.code === 'staff') {
        return res.status(400).json({ message: 'Supplier ID is required.' });
      }
    }

    await query('BEGIN');

    try {
      const sql = `
        INSERT INTO products (
          name, description, barcode, sku, category_id, supplier_id, price, cost_price,
          tax_rate, stock_quantity, min_stock_quantity, reorder_quantity,
          image_url, is_active, weight, dimensions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      
      
      const initialStockQuantity = isSupplier ? 0 : (stock_quantity || 0);

      const values = [
        name,
        description,
        barcode,
        sku,
        category_id,
        productSupplierId,
        price,
        cost_price,
        tax_rate || 0,
        initialStockQuantity,
        min_stock_quantity || 0,
        reorder_quantity || 0,
        image_url,
        is_active,
        weight,
        dimensions
      ];

      const result = await query(sql, values);
      const productId = result.rows[0].id;
      console.log(isSupplier, req.user.supplierId, stock_quantity);
      
      
      if (isSupplier && stock_quantity > 0) {
        
        await query(
          'INSERT INTO supplier_stock (supplier_id, product_id, stock_quantity, min_stock_quantity) VALUES ($1, $2, $3, $4)',
          [productSupplierId, productId, stock_quantity, min_stock_quantity || 0]
        );

        
        const movementSql = `
          INSERT INTO stock_movements (
            product_id, type, quantity, previous_quantity, new_quantity, 
            notes, created_by
          ) 
          VALUES ($1, 'receipt', $2, $3, $4, $5, $6)
        `;
        
        await query(movementSql, [
          productId,
          stock_quantity,
          0,
          stock_quantity,
          'Initial supplier stock',
          req.user?.id || null
        ]);
      } 
      
      else if (initialStockQuantity > 0) {
        const stockMovementSql = `
          INSERT INTO stock_movements (
            product_id, type, quantity, notes, created_by, previous_quantity, new_quantity
          )
          VALUES ($1, 'receipt', $2, $3, $4, 0, $2)
        `;

        await query(stockMovementSql, [
          productId,
          initialStockQuantity,
          'Initial stock',
          req.user?.id || null
        ]);
      }

      const getProductSql = `
        SELECT p.*, c.name as category_name,
          s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = $1 and p.is_active = true
      `;

      const productResult = await query(getProductSql, [productId]);
      
      
      if (isSupplier && req.user.supplierId) {
        const supplierStockSql = `
          SELECT stock_quantity, min_stock_quantity
          FROM supplier_stock
          WHERE supplier_id = $1 AND product_id = $2
        `;
        
        const stockResult = await query(supplierStockSql, [req.user.supplierId, productId]);
        
        if (stockResult.rows.length > 0) {
          productResult.rows[0].supplier_stock_quantity = stockResult.rows[0].stock_quantity;
          productResult.rows[0].supplier_min_stock_quantity = stockResult.rows[0].min_stock_quantity;
        } else {
          productResult.rows[0].supplier_stock_quantity = 0;
          productResult.rows[0].supplier_min_stock_quantity = 0;
        }
      }
      
      
      await query('COMMIT');
      
      
      const product = productResult.rows[0];
      if (product.stock_quantity <= product.min_stock_quantity) {
        try {
          await triggerNotifications.lowStockNotification(product);
        } catch (notifErr) {
          console.error('Error creating low stock notification:', notifErr);
          
        }
      }

      res.status(201).json(product);
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
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
      supplier_id,
      price,
      cost_price,
      tax_rate,
      stock_quantity,
      min_stock_quantity,
      reorder_quantity,
      image_url,
      is_active,
      weight,
      dimensions
    } = req.body;

    
    if (sku !== undefined && !sku) {
      return res.status(400).json({ message: 'SKU is a required field.' });
    }

    const checkResult = await query('SELECT * FROM products WHERE id = $1 and is_active = true', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const isSupplier = req.user && req.user.role && req.user.role.code === 'supplier';
    let supplierIdFromUser = null;
    
    if (isSupplier) {
      
      if (!req.user.supplierId && req.user.id) {
        const supplierResult = await query('SELECT id FROM suppliers WHERE user_id = $1', [req.user.id]);
        if (supplierResult.rows.length > 0) {
          supplierIdFromUser = supplierResult.rows[0].id;
        }
      } else if (req.user.supplierId) {
        supplierIdFromUser = req.user.supplierId;
      }
      
      if (!supplierIdFromUser) {
        return res.status(400).json({ message: 'Supplier information not found for this user.' });
      }
      
      if (checkResult.rows[0].supplier_id !== supplierIdFromUser) {
        return res.status(403).json({ message: 'You can only update your own products.' });
      }
    }

    
    if (sku !== undefined && sku !== checkResult.rows[0].sku) {
      const existingSku = await query('SELECT id FROM products WHERE sku = $1 AND id != $2 and is_active = true', [sku, id]);
      if (existingSku.rows.length > 0) {
        return res.status(400).json({ message: 'This SKU is already in use. Please enter a unique SKU.' });
      }
    }

    
    let productSupplierId = checkResult.rows[0].supplier_id;
    
    if (isSupplier) {
      productSupplierId = supplierIdFromUser;
    } else if (supplier_id !== undefined) {
      productSupplierId = supplier_id;
    }

    await query('BEGIN');

    try {
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
      
      
      updates.push(`supplier_id = $${paramCount++}`);
      values.push(productSupplierId);

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

      
      if (stock_quantity !== undefined && !isSupplier) {
        updates.push(`stock_quantity = $${paramCount++}`);
        values.push(stock_quantity);
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
        await query('ROLLBACK');
        return res.status(400).json({ message: 'No fields to update' });
      }

      const sql = `
        UPDATE products 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id
      `;

      values.push(id);

      await query(sql, values);

      
      if (isSupplier && stock_quantity !== undefined) {
        
        const stockCheck = await query(
          'SELECT stock_quantity FROM supplier_stock WHERE supplier_id = $1 AND product_id = $2',
          [supplierIdFromUser, id]
        );

        if (stockCheck.rows.length > 0) {
          
          await query(
            'UPDATE supplier_stock SET stock_quantity = $1, min_stock_quantity = $2, updated_at = NOW() WHERE supplier_id = $3 AND product_id = $4',
            [stock_quantity, min_stock_quantity || 0, supplierIdFromUser, id]
          );
        } else {
          
          await query(
            'INSERT INTO supplier_stock (supplier_id, product_id, stock_quantity, min_stock_quantity) VALUES ($1, $2, $3, $4)',
            [supplierIdFromUser, id, stock_quantity, min_stock_quantity || 0]
          );
        }

        
        const previousQty = stockCheck.rows.length > 0 ? parseInt(stockCheck.rows[0].stock_quantity) : 0;
        if (previousQty !== parseInt(stock_quantity)) {
          const movementSql = `
            INSERT INTO stock_movements (
              product_id, type, quantity, previous_quantity, new_quantity, 
              notes, created_by
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          
          const moveType = parseInt(stock_quantity) > previousQty ? 'receipt' : 'adjustment';
          const qtyDiff = Math.abs(parseInt(stock_quantity) - previousQty);
          
          await query(movementSql, [
            id,
            moveType,
            qtyDiff,
            previousQty,
            parseInt(stock_quantity),
            'Supplier stock adjustment',
            req.user?.id || null
          ]);
        }
      }

      const getProductSql = `
        SELECT p.*, c.name as category_name,
          s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = $1 and p.is_active = true
      `;

      const productResult = await query(getProductSql, [id]);
      const product = productResult.rows[0];
      
      
      if (isSupplier) {
        const supplierStockSql = `
          SELECT stock_quantity, min_stock_quantity
          FROM supplier_stock
          WHERE supplier_id = $1 AND product_id = $2
        `;
        
        const stockResult = await query(supplierStockSql, [supplierIdFromUser, id]);
        
        if (stockResult.rows.length > 0) {
          product.supplier_stock_quantity = stockResult.rows[0].stock_quantity;
          product.supplier_min_stock_quantity = stockResult.rows[0].min_stock_quantity;
        } else {
          product.supplier_stock_quantity = 0;
          product.supplier_min_stock_quantity = 0;
        }
      }
      
      
      await query('COMMIT');
      
      
      if (price !== undefined && checkResult.rows[0].price != price) {
        try {
          const oldPrice = parseFloat(checkResult.rows[0].price);
          const newPrice = parseFloat(price);
          
          await triggerNotifications.productPriceChangeNotification(product, oldPrice, newPrice);
        } catch (notifErr) {
          console.error('Error creating price change notification:', notifErr);
          
        }
      }
      
      
      if (product.stock_quantity <= product.min_stock_quantity) {
        try {
          await triggerNotifications.lowStockNotification(product);
        } catch (notifErr) {
          console.error('Error creating low stock notification:', notifErr);
          
        }
      }

      res.json(product);
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
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
    console.log(id);
    const checkResult = await query('SELECT * FROM products WHERE id = $1 and is_active = true', [id]);

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

    await query('DELETE FROM products WHERE id = $1 and is_active = true', [id]);

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

    const checkResult = await query('SELECT * FROM products WHERE id = $1 and is_active = true', [id]);

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
      
      
      const updatedProduct = updateResult.rows[0];
      if (updatedProduct.stock_quantity <= updatedProduct.min_stock_level) {
        try {
          await triggerNotifications.lowStockNotification(updatedProduct);
        } catch (notifErr) {
          console.error('Error creating low stock notification:', notifErr);
          
        }
      }

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

    const checkResult = await query('SELECT * FROM products WHERE id = $1 and is_active = true', [id]);

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

/**
 * Upload a product image and return the URL
 * @route POST /api/products/upload-image
 */
exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.image) {
      return res.status(400).json({ message: 'No image file was uploaded' });
    }
    
    const imageFile = req.files.image;
    
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ message: 'Only JPEG, PNG, GIF, and WEBP images are allowed' });
    }
    
    
    const maxSize = 5 * 1024 * 1024; 
    if (imageFile.size > maxSize) {
      return res.status(400).json({ message: 'Image size should be less than 5MB' });
    }
    
    
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `product_${timestamp}.${fileExtension}`;
    
    
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'products');
    
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = `${uploadPath}/${fileName}`;
    
    
    await imageFile.mv(filePath);
    
    
    const imageUrl = `/uploads/products/${fileName}`;
    
    
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
    const fullImageUrl = `${baseUrl}${imageUrl}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl, 
      fullImageUrl: fullImageUrl 
    });
  } catch (err) {
    console.error('Error uploading product image:', err);
    res.status(500).json({ message: 'Error uploading product image', error: err.message });
  }
};

/**
 * Get all supplier products for ordering
 * This will be used by admin to see all available products from suppliers
 */
exports.getAllSupplierProducts = async (req, res) => {
  try {
    const {
      search,
      supplier_id,
      sort_by = 'name',
      sort_dir = 'ASC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.supplier_id IS NOT NULL and p.is_active = true
    `;

    const params = [];

    if (search) {
      sql += ` AND (
        p.name ILIKE $${params.length + 1} OR
        p.sku ILIKE $${params.length + 1} OR
        p.barcode ILIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    if (supplier_id) {
      sql += ` AND p.supplier_id = $${params.length + 1}`;
      params.push(supplier_id);
    }
    
    const countSql = sql.replace("p.*, c.name as category_name, s.name as supplier_name", "COUNT(*)");
    const countResult = await query(countSql, params);
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
    console.error('Error fetching supplier products:', err);
    res.status(500).json({ message: 'Error fetching supplier products', error: err.message });
  }
}; 