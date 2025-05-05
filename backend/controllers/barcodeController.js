const { query } = require('../config/db');
const triggerNotifications = require('../utils/triggerNotifications');

/**
 * Scan a barcode and check for shipped supplier orders containing this product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.scanBarcode = async (req, res) => {
  try {
    const { barcode } = req.body;

    console.log(`[INFO] Scanning barcode: ${barcode}`);

    if (!barcode) {
      console.log(`[ERROR] Barcode not provided in request`);
      return res.status(400).json({ 
        success: false, 
        message: 'Barcode is required' 
      });
    }

    
    const productSql = `
      SELECT id, name, sku, barcode, stock_quantity, image_url
      FROM products
      WHERE barcode = $1 and is_active = true
    `;

    console.log(`[DEBUG] Searching for product with barcode: ${barcode}`);
    const productResult = await query(productSql, [barcode]);

    if (productResult.rows.length === 0) {
      console.log(`[WARNING] No product found with barcode: ${barcode}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Product with this barcode not found' 
      });
    }

    const product = productResult.rows[0];
    console.log(`[INFO] Found product: ID=${product.id}, Name=${product.name}, SKU=${product.sku}`);

    
    const supplierOrdersSql = `
      SELECT so.id, so.supplier_id, s.name as supplier_name, so.status, so.created_at, 
             soi.id as order_item_id, soi.quantity, soi.product_id
      FROM supplier_orders so
      JOIN supplier_order_items soi ON so.id = soi.supplier_order_id
      LEFT JOIN suppliers s ON so.supplier_id = s.id
      WHERE so.status = 'shipped' AND soi.product_id = $1
      ORDER BY so.created_at DESC
    `;

    console.log(`[DEBUG] Searching for shipped supplier orders with product ID: ${product.id}`);
    const supplierOrdersResult = await query(supplierOrdersSql, [product.id]);
    console.log(`[INFO] Found ${supplierOrdersResult.rows.length} shipped supplier orders for product ID: ${product.id}`);

    if (supplierOrdersResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        product,
        message: 'No shipped supplier orders found containing this product',
        orders: []
      });
    }

    
    await query('BEGIN');
    
    try {
      const confirmedItems = [];
      
      
      for (const order of supplierOrdersResult.rows) {
        console.log(`[INFO] Processing supplier order ID: ${order.id} from supplier: ${order.supplier_name}`);
        
        
        const updateOrderSql = `
          UPDATE supplier_orders
          SET status = 'delivered', updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        console.log(`[DEBUG] Updating supplier order ${order.id} status to 'delivered'`);
        const updatedOrder = await query(updateOrderSql, [order.id]);
        console.log(`[INFO] Updated supplier order ${order.id} to 'delivered' status`);
        
        
        try {
          await triggerNotifications.supplierOrderStatusChange(updatedOrder.rows[0]);
          console.log(`[INFO] Created notification for supplier order ${order.id} status change`);
        } catch (notifErr) {
          console.error(`[ERROR] Error creating supplier order status notification: ${notifErr.message}`);
        }
        
        confirmedItems.push({
          supplier_order_id: order.id,
          supplier_name: order.supplier_name,
          product_id: product.id,
          product_name: product.name,
          quantity: order.quantity,
          scanned_at: new Date()
        });
      }
      
      await query('COMMIT');
      console.log(`[INFO] Transaction committed successfully for barcode: ${barcode}`);
      
      return res.json({
        success: true,
        product,
        confirmed_items: confirmedItems,
        message: `Successfully updated ${confirmedItems.length} supplier orders with this barcode to 'delivered' status`
      });
      
    } catch (transactionErr) {
      await query('ROLLBACK');
      console.error(`[ERROR] Transaction failed, rolled back: ${transactionErr.message}`);
      throw transactionErr;
    }
    
  } catch (err) {
    console.error(`[ERROR] Error scanning barcode: ${err.message}`);
    
    
    try {
      await query('ROLLBACK');
      console.log(`[INFO] Rollback completed after error`);
    } catch (rollbackErr) {
      console.error(`[ERROR] Error rolling back transaction: ${rollbackErr.message}`);
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Error scanning barcode', 
      error: err.message 
    });
  }
}; 