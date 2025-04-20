const notificationController = require('../controllers/notificationController');

/**
 * Creates a notification when a product's stock falls below the threshold
 * @param {Object} product - The product object
 * @param {number} product.id - Product ID
 * @param {string} product.name - Product name
 * @param {number} product.stock_quantity - Current stock quantity
 * @param {number} product.min_stock_level - Minimum stock threshold
 */
exports.lowStockNotification = async (product) => {
  
  await notificationController.createSystemNotification({
    title: 'Low Stock Alert',
    message: `${product.name} is running low on stock (${product.stock_quantity} remaining).`,
    type: 'warning',
    action_link: `/stock/products/${product.id}`,
    reference_id: product.id,
    reference_type: 'product',
    role_code: 'warehouse' 
  });
  
  
  return await notificationController.createSystemNotification({
    title: 'Low Stock Alert',
    message: `${product.name} is running low on stock (${product.stock_quantity} remaining).`,
    type: 'warning',
    action_link: `/stock/products/${product.id}`,
    reference_id: product.id,
    reference_type: 'product',
    role_code: 'manager' 
  });
};

/**
 * Creates a notification when a new order is placed
 * @param {Object} order - The order object
 * @param {number} order.id - Order ID
 * @param {string} order.order_number - Order number
 * @param {number} order.total_amount - Order total amount
 * @param {string} customerName - Customer name
 */
exports.newOrderNotification = async (order, customerName) => {
  
  await notificationController.createSystemNotification({
    title: 'New Order Received',
    message: `Order #${order.order_number || order.id} for $${order.total_amount} from ${customerName} has been received.`,
    type: 'success',
    action_link: `/orders/${order.id}`,
    reference_id: order.id,
    reference_type: 'order',
    role_code: 'sales' 
  });
  
  
  await notificationController.createSystemNotification({
    title: 'New Order - Prepare Items',
    message: `New order #${order.order_number || order.id} requires preparation.`,
    type: 'info',
    action_link: `/orders/${order.id}`,
    reference_id: order.id,
    reference_type: 'order',
    role_code: 'warehouse' 
  });
  
  
  return await notificationController.createSystemNotification({
    title: 'New Order Received',
    message: `Order #${order.order_number || order.id} for $${order.total_amount} from ${customerName} has been received.`,
    type: 'success',
    action_link: `/orders/${order.id}`,
    reference_id: order.id,
    reference_type: 'order',
    role_code: 'manager' 
  });
};

/**
 * Creates a notification when a supplier order is received
 * @param {Object} supplierOrder - The supplier order object
 * @param {number} supplierOrder.id - Supplier order ID
 * @param {string} supplierOrder.order_number - Supplier order number
 * @param {string} supplierName - Supplier name
 * @param {number} supplierId - Supplier ID
 */
exports.supplierOrderReceivedNotification = async (supplierOrder, supplierName, supplierId) => {
  
  if (supplierId) {
    await notificationController.createSystemNotification({
      title: 'New Order Placed',
      message: `Order #${supplierOrder.order_number || supplierOrder.id} has been placed with ${supplierName}.`,
      type: 'info',
      action_link: `/supplier-orders`,
      reference_id: supplierOrder.id,
      reference_type: 'supplier_order',
      role_code: 'supplier' 
      
    });
  }
  
  
  await notificationController.createSystemNotification({
    title: 'Supplier Order Placed',
    message: `Order #${supplierOrder.order_number || supplierOrder.id} from ${supplierName} has been placed.`,
    type: 'info',
    action_link: `/supplier-orders`,
    reference_id: supplierOrder.id,
    reference_type: 'supplier_order',
    role_code: 'warehouse' 
  });
  
  
  return await notificationController.createSystemNotification({
    title: 'Supplier Order Placed',
    message: `Order #${supplierOrder.order_number || supplierOrder.id} from ${supplierName} has been placed.`,
    type: 'info',
    action_link: `/supplier-orders`,
    reference_id: supplierOrder.id,
    reference_type: 'supplier_order',
    role_code: 'manager' 
  });
};

/**
 * Creates a notification for product price changes
 * @param {Object} product - The product object
 * @param {number} product.id - Product ID
 * @param {string} product.name - Product name
 * @param {number} oldPrice - Previous price
 * @param {number} newPrice - New price
 */
exports.productPriceChangeNotification = async (product, oldPrice, newPrice) => {
  const priceChange = newPrice > oldPrice ? 'increased' : 'decreased';
  
  
  await notificationController.createSystemNotification({
    title: 'Product Price Change',
    message: `Price for ${product.name} has ${priceChange} from $${oldPrice} to $${newPrice}.`,
    type: 'info',
    action_link: `/stock/products/${product.id}`,
    reference_id: product.id,
    reference_type: 'product',
    role_code: 'sales' 
  });
  
  
  return await notificationController.createSystemNotification({
    title: 'Product Price Change',
    message: `Price for ${product.name} has ${priceChange} from $${oldPrice} to $${newPrice}.`,
    type: 'info',
    action_link: `/stock/products/${product.id}`,
    reference_id: product.id,
    reference_type: 'product',
    role_code: 'manager' 
  });
};

/**
 * Creates a notification for system announcements
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Optional action link
 */
exports.systemAnnouncementNotification = async (title, message, link = null) => {
  return await notificationController.createSystemNotification({
    title,
    message,
    type: 'announcement',
    action_link: link,
    is_global: true 
  });
};

/**
 * Creates a notification for AI-generated supplier orders
 * @param {Object} order - The supplier order object
 * @param {number} order.id - Order ID
 * @param {string} supplierName - Supplier name
 * @param {number} supplierId - Supplier ID
 */
exports.aiSupplierOrderNotification = async (order, supplierName, supplierId) => {
  
  if (supplierId) {
    await notificationController.createSystemNotification({
      title: 'New AI-Generated Order',
      message: `Our system has automatically created order #${order.id} with ${supplierName}.`,
      type: 'info',
      action_link: `/supplier-orders/${order.id}`,
      reference_id: order.id,
      reference_type: 'supplier_order',
      role_code: 'supplier' 
    });
  }
  
  
  await notificationController.createSystemNotification({
    title: 'AI Created Supplier Order',
    message: `AI has automatically created order #${order.id} with ${supplierName} based on inventory analysis.`,
    type: 'info',
    action_link: `/supplier-orders/${order.id}`,
    reference_id: order.id,
    reference_type: 'supplier_order',
    role_code: 'warehouse' 
  });
  
  
  return await notificationController.createSystemNotification({
    title: 'AI Created Supplier Order',
    message: `AI has automatically created order #${order.id} with ${supplierName} based on inventory analysis.`,
    type: 'info',
    action_link: `/supplier-orders/${order.id}`,
    reference_id: order.id,
    reference_type: 'supplier_order',
    role_code: 'manager' 
  });
};

/**
 * Creates a notification when a supplier order status changes
 * @param {Object} order - The supplier order object
 * @param {number} order.id - Order ID
 * @param {string} order.order_number - Order number (optional)
 * @param {string} order.status - New status of the order
 * @param {number} order.supplier_id - Supplier ID
 */
exports.supplierOrderStatusChange = async (order) => {
  try {
    
    let supplierName = "supplier";
    if (order.supplier_id) {
      
      const { query } = require('../config/db');
      const supplierResult = await query('SELECT name FROM suppliers WHERE id = $1', [order.supplier_id]);
      if (supplierResult.rows.length > 0) {
        supplierName = supplierResult.rows[0].name;
      }
    }

    const orderIdentifier = order.order_number || `#${order.id}`;
    let message = `Order ${orderIdentifier} status changed to: ${order.status}`;
    let type = 'info';
    
    
    if (order.status === 'completed') {
      message = `Order ${orderIdentifier} from ${supplierName} has been completed and received.`;
      type = 'success';
    } else if (order.status === 'cancelled') {
      message = `Order ${orderIdentifier} from ${supplierName} has been cancelled.`;
      type = 'warning';
    } else if (order.status === 'shipped') {
      message = `Order ${orderIdentifier} from ${supplierName} has been shipped and is on its way.`;
      type = 'info';
    }
    
    
    await notificationController.createSystemNotification({
      title: `Supplier Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
      message: message,
      type: type,
      action_link: `/supplier-orders/${order.id}`,
      reference_id: order.id,
      reference_type: 'supplier_order',
      role_code: 'warehouse' 
    });
    
    
    return await notificationController.createSystemNotification({
      title: `Supplier Order Status Update`,
      message: message,
      type: type,
      action_link: `/supplier-orders/${order.id}`,
      reference_id: order.id,
      reference_type: 'supplier_order',
      role_code: 'manager' 
    });
  } catch (err) {
    console.error('Error creating supplier order status notification:', err);
    
    return Promise.resolve();
  }
}; 