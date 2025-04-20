const db = require('../config/db');

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    
    const productsQuery = `SELECT COUNT(*) as total FROM products WHERE is_active = true`;
    const productsResult = await db.query(productsQuery);
    const totalProducts = parseInt(productsResult.rows[0].total) || 0;

    
    const lowStockQuery = `SELECT COUNT(*) as total FROM products WHERE stock_quantity < min_stock_quantity AND is_active = true`;
    const lowStockResult = await db.query(lowStockQuery);
    const lowStockItems = parseInt(lowStockResult.rows[0].total) || 0;

    
    const todayOrdersQuery = `
      SELECT COUNT(*) as total 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const todayOrdersResult = await db.query(todayOrdersQuery);
    const todayOrders = parseInt(todayOrdersResult.rows[0].total) || 0;

    
    const revenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const revenueResult = await db.query(revenueQuery);
    const monthlyRevenue = parseFloat(revenueResult.rows[0].total) || 0;

    res.json({
      stats: {
        totalProducts,
        lowStockItems,
        todayOrders,
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics', error: error.message });
  }
};

/**
 * Get sales data for the last 7 days
 * @route GET /api/dashboard/sales
 */
exports.getSalesData = async (req, res) => {
  try {
    const salesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const salesResult = await db.query(salesQuery);
    
    
    const sales = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = salesResult.rows.find(row => row.date.toISOString().split('T')[0] === dateStr);
      
      if (existingData) {
        sales.push({
          date: dateStr,
          total: parseFloat(existingData.total) || 0,
          count: parseInt(existingData.order_count) || 0
        });
      } else {
        sales.push({
          date: dateStr,
          total: 0,
          count: 0
        });
      }
    }
    
    res.json({ sales });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ message: 'Error fetching sales data', error: error.message });
  }
};

/**
 * Get recent activities for the dashboard
 * @route GET /api/dashboard/activities
 */
exports.getRecentActivities = async (req, res) => {
  try {
    
    const ordersQuery = `
      SELECT 
        id, 
        order_number,  
        status, 
        total_amount, 
        created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const ordersResult = await db.query(ordersQuery);
    
    
    const productsQuery = `
      SELECT 
        id, 
        name, 
        stock_quantity, 
        updated_at 
      FROM products 
      WHERE stock_quantity < min_stock_quantity AND is_active = true 
      ORDER BY stock_quantity ASC 
      LIMIT 3
    `;
    const productsResult = await db.query(productsQuery);
    
    
    const activities = [];
    
    
    ordersResult.rows.forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        action: 'New order placed',
        product: `Order #${order.order_number || order.id}`,
        time: order.created_at,
        amount: order.total_amount,
        status: order.status,
        type: 'order',
        link: `/orders/${order.id}`
      });
    });
     
    
    productsResult.rows.forEach(product => {
      activities.push({
        id: `stock-${product.id}`,
        action: 'Stock Low!',
        product: product.name,
        time: product.updated_at,
        amount: null,
        status: 'warning',
        type: 'warning',
        remainingStock: product.stock_quantity,
        link: `/stock/products`
      });
    });
    
    
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    res.json({ activities: activities.slice(0, 5) });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ message: 'Error fetching recent activities', error: error.message });
  }
};

/**
 * Get supplier-specific dashboard statistics
 * @route GET /api/dashboard/supplier-stats
 */
exports.getSupplierStats = async (req, res) => {
  try {
    const { supplier_id } = req.query;
    
    if (!supplier_id) {
      return res.status(400).json({ message: 'Supplier ID is required' });
    }

    
    const productsQuery = `
      SELECT COUNT(*) as total 
      FROM products 
      WHERE supplier_id = $1 AND is_active = true
    `;
    const productsResult = await db.query(productsQuery, [supplier_id]);
    const totalProducts = parseInt(productsResult.rows[0].total) || 0;

    
    const pendingOrdersQuery = `
      SELECT COUNT(DISTINCT so.id) as total
      FROM supplier_orders so
      WHERE so.supplier_id = $1 
      AND so.status = 'pending'
    `;
    const pendingOrdersResult = await db.query(pendingOrdersQuery, [supplier_id]);
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].total) || 0;

    
    const monthlyOrdersQuery = `
      SELECT COUNT(DISTINCT so.id) as total
      FROM supplier_orders so
      WHERE so.supplier_id = $1 
      AND DATE_TRUNC('month', so.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const monthlyOrdersResult = await db.query(monthlyOrdersQuery, [supplier_id]);
    const monthlyOrders = parseInt(monthlyOrdersResult.rows[0].total) || 0;

    
    const recentOrdersQuery = `
      SELECT 
        so.id,
        so.status,
        so.total_amount,
        so.created_at
      FROM supplier_orders so
      WHERE so.supplier_id = $1
      ORDER BY so.created_at DESC
      LIMIT 5
    `;
    const recentOrdersResult = await db.query(recentOrdersQuery, [supplier_id]);

    res.json({
      stats: {
        totalProducts,
        pendingOrders,
        monthlyOrders,
        recentOrders: recentOrdersResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching supplier dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching supplier dashboard statistics', error: error.message });
  }
};

/**
 * Get customer-specific dashboard statistics
 * @route GET /api/dashboard/customer-stats
 */
exports.getCustomerStats = async (req, res) => {
  try {
    const { customer_id } = req.query;
    
    if (!customer_id) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    
    const ordersQuery = `
      SELECT COUNT(*) as total 
      FROM orders 
      WHERE customer_id = $1
    `;
    const ordersResult = await db.query(ordersQuery, [customer_id]);
    const totalOrders = parseInt(ordersResult.rows[0].total) || 0;

    
    const pendingOrdersQuery = `
      SELECT COUNT(*) as total 
      FROM orders 
      WHERE customer_id = $1 AND status IN ('pending', 'processing')
    `;
    const pendingOrdersResult = await db.query(pendingOrdersQuery, [customer_id]);
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].total) || 0;
    
    
    const shippedOrdersQuery = `
      SELECT COUNT(*) as total 
      FROM orders 
      WHERE customer_id = $1 AND lower(status) = 'shipped'
    `;
    const shippedOrdersResult = await db.query(shippedOrdersQuery, [customer_id]);
    const shippedOrders = parseInt(shippedOrdersResult.rows[0].total) || 0;

    
    const spentQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE customer_id = $1
    `;
    const spentResult = await db.query(spentQuery, [customer_id]);
    const totalSpent = parseFloat(spentResult.rows[0].total) || 0;

    
    const recentOrdersQuery = `
      SELECT 
        id,
        order_number,
        status,
        total_amount,
        created_at
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentOrdersResult = await db.query(recentOrdersQuery, [customer_id]);

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        shippedOrders,
        totalSpent,
        recentOrders: recentOrdersResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching customer dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching customer dashboard statistics', error: error.message });
  }
}; 