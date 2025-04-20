const { query } = require('../config/db');
const axios = require('axios');
require('dotenv').config();
const notificationController = require('./notificationController');
const triggerNotifications = require('../utils/triggerNotifications');


console.log('[DEBUG] Environment variables:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'not set, using default'}`);
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'is set' : 'NOT SET'}`);
if (process.env.OPENAI_API_KEY) {
  console.log(`    Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 3)}... and is ${process.env.OPENAI_API_KEY.length} characters long`);
}


const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || false;

console.log(`[DEBUG] Development mode: ${DEVELOPMENT_MODE}`);
console.log(`[DEBUG] Using mock data: ${USE_MOCK_DATA}`);


const OPENAI_API_KEY = USE_MOCK_DATA ? null : process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';


const headers = { 
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${OPENAI_API_KEY}`
}; 


let USE_MOCK_ON_RATE_LIMIT = true;

/** 
 * Get stock predictions for products with low stock
 */
exports.getStockPredictions = async (req, res) => {
  try {
    
    const isCronJob = !req;
    
    
    const useCache = req?.query?.useCache === 'true';
    
    if (useCache) {
      
      const cacheSql = `
        SELECT response_data, created_at
        FROM ai_interactions
        WHERE type = 'stock_prediction'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const cacheResult = await query(cacheSql);
      
      if (cacheResult.rows.length > 0) {
        return res.json({
          message: 'Retrieved cached stock predictions',
          predictions: cacheResult.rows[0].response_data,
          cached: true,
          timestamp: cacheResult.rows[0].created_at
        });
      }
    }
    
    
    const lowStockSql = `
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.stock_quantity, 
        p.min_stock_quantity, 
        p.reorder_quantity,
        c.name as category_name,
        COALESCE(
          (SELECT SUM(soi.quantity) 
           FROM supplier_order_items soi
           JOIN supplier_orders so ON soi.supplier_order_id = so.id
           WHERE soi.product_id = p.id AND so.status = 'pending'),
           0
        ) as pending_order_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.min_stock_quantity AND p.is_active = true
      ORDER BY (p.stock_quantity * 1.0 / NULLIF(p.min_stock_quantity, 0)) ASC
      LIMIT 20
    `;
    
    const lowStockResult = await query(lowStockSql);
    
    if (lowStockResult.rows.length === 0) {
      return res.json({
        message: 'No products need stock replenishment currently.',
        predictions: []
      });
    }

    
    const productIds = lowStockResult.rows.map(p => p.id);
    const historySql = `
      SELECT oi.product_id, 
        DATE_TRUNC('month', o.created_at) as month,
        SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ANY($1)
      AND o.created_at > NOW() - INTERVAL '6 months'
      GROUP BY oi.product_id, DATE_TRUNC('month', o.created_at)
      ORDER BY oi.product_id, month
    `;
    
    const historyResult = await query(historySql, [productIds]);
    
    
    const products = lowStockResult.rows.map(product => {
      const salesHistory = historyResult.rows
        .filter(row => row.product_id === product.id)
        .map(row => ({
          month: row.month,
          quantity_sold: parseInt(row.quantity_sold)
        }));
      
      
      const effectiveStock = parseInt(product.stock_quantity) + parseInt(product.pending_order_quantity || 0);
      
      return {
        ...product,
        effective_stock: effectiveStock,
        pending_orders: parseInt(product.pending_order_quantity || 0),
        sales_history: salesHistory
      };
    });

    
    const prompt = {
      role: "system",
      content: `You are an AI inventory management assistant helping to predict stock needs. 
      Analyze the products with low stock and their sales history to provide:
      1. Recommended order quantity
      2. Ideal minimum stock level
      3. Reasoning for your recommendation based on historical demand patterns and trends.
      
      Note that some products may already have pending orders. The effective_stock field includes 
      both current stock_quantity and pending_order_quantity. Consider both values in your analysis.
      
      When a product has significant pending orders, you should reduce or eliminate the recommended order quantity.
      
      Provide your response in JSON format with these fields: product_id, name, current_stock, effective_stock,
      pending_orders, recommended_order_quantity, minimum_stock_level, priority, reasoning.`
    };

    const aiResponse = await requestOpenAI(prompt, { products: products });
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'Failed to generate AI predictions',
        predictions: []
      });
    }
    
    
    await saveAIInteraction('stock_prediction', {
      products: products,
      current_stock: lowStockResult.rows
    }, aiResponse);
    
    
    await saveAIAction('stock_prediction', {
      summary: `Analyzed ${products.length} products for stock levels`,
      predictions: aiResponse.predictions ? 
        (Array.isArray(aiResponse.predictions) ? aiResponse.predictions.length : 1) : 0,
      critical_items: aiResponse.predictions ? 
        (Array.isArray(aiResponse.predictions) ? 
          aiResponse.predictions.filter(p => p.priority === 'high' || p.priority === 'urgent').length : 0) : 0
    });
    
    
    if (aiResponse.predictions) {
      const predictions = Array.isArray(aiResponse.predictions) ? 
        aiResponse.predictions : [aiResponse.predictions];
      
      const criticalItems = predictions.filter(p => 
        p.priority === 'high' || p.priority === 'urgent'
      );
      
      if (criticalItems.length > 0) {
        
        criticalItems.forEach(item => {
          triggerNotifications.lowStockNotification({
            id: item.product_id,
            name: item.name,
            stock_quantity: item.current_stock || 'Low',
            min_stock_quantity: item.minimum_stock_level || 'Unknown'
          });
        });
      }
    }
    
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Stock Predictions Ready',
      `AI has analyzed ${products.length} products and provided stock level recommendations.`,
      '/ai-analytics'
    );
    
    
    if (isCronJob) {
      return {
        message: 'Stock predictions generated successfully',
        predictions: aiResponse
      };
    }
    
    
    res.json({
      message: 'Stock predictions generated successfully',
      predictions: aiResponse
    });
    
  } catch (err) {
    console.error('Error generating stock predictions:', err);
    
    
    if (!req) throw err;
    
    
    res.status(500).json({ 
      message: 'Error generating stock predictions', 
      error: err.message 
    });
  }
};

/**
 * Get sales forecasts for specific products or categories
 */
exports.getSalesForecasts = async (req, res) => {
  try {
    
    const isCronJob = !req;
    const params = req ? req.query : {};
    const { product_id, category_id, period = '3_months', useCache = 'true' } = params;
    
    if (useCache === 'true') {
      
      let cacheSql = `
        SELECT response_data, created_at
        FROM ai_interactions
        WHERE type = 'sales_forecast'
      `;
      
      const cacheParams = [];
      
      if (product_id) {
        cacheSql += ` AND request_data->>'product_id' = $1`;
        cacheParams.push(product_id);
      } else if (category_id) {
        cacheSql += ` AND request_data->>'category_id' = $1`;
        cacheParams.push(category_id);
      }
      
      cacheSql += ` ORDER BY created_at DESC LIMIT 1`;
      
      const cacheResult = await query(cacheSql, cacheParams);
      
      if (cacheResult.rows.length > 0) {
        return res.json({
          message: 'Retrieved cached sales forecasts',
          forecasts: cacheResult.rows[0].response_data,
          cached: true,
          timestamp: cacheResult.rows[0].created_at
        });
      }
    }
    
    let targetCondition = '1=1';
    const queryParams = [];
    
    if (product_id) {
      targetCondition = 'p.id = $1';
      queryParams.push(product_id);
    } else if (category_id) {
      targetCondition = 'p.category_id = $1';
      queryParams.push(category_id);
    }
    
    
    const salesSql = `
      SELECT 
        p.id, p.name, p.sku, c.name as category_name,
        DATE_TRUNC('month', o.created_at) as month,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as revenue
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${targetCondition}
      AND o.created_at > NOW() - INTERVAL '12 months'
      GROUP BY p.id, p.name, p.sku, c.name, DATE_TRUNC('month', o.created_at)
      ORDER BY p.id, month
    `;
    
    const salesResult = await query(salesSql, queryParams);
    
    
    const productMap = {};
    salesResult.rows.forEach(row => {
      if (!productMap[row.id]) {
        productMap[row.id] = {
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category_name,
          monthly_sales: []
        };
      }
      
      productMap[row.id].monthly_sales.push({
        month: row.month,
        quantity_sold: parseInt(row.quantity_sold),
        revenue: parseFloat(row.revenue)
      });
    });
    
    const products = Object.values(productMap);
    
    
    const prompt = {
      role: "system",
      content: `You are an AI sales forecasting assistant. Analyze the historical sales data for the following products
      to forecast sales for the next ${period === '3_months' ? 'three months' : 'six months'}.
      For each product, provide:
      1. Forecasted monthly sales quantities for each upcoming month
      2. Projected revenue based on past pricing
      3. Growth trend analysis
      4. Seasonal factors affecting sales
      Provide your response in JSON format with these fields for each product: product_id, name, 
      forecasted_months (array of month objects with quantity and revenue), growth_trend, seasonal_factors.`
    };

    const aiResponse = await requestOpenAI(prompt, { 
      products: products,
      forecast_period: period === '3_months' ? 3 : 6
    });
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'Failed to generate sales forecasts',
        forecasts: []
      });
    }
    
    
    await saveAIInteraction('sales_forecast', {
      products: products,
      period: period
    }, aiResponse);
    
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Sales Forecasts Ready',
      `AI has generated sales forecasts for the next ${period === '3_months' ? '3' : '6'} months.`,
      '/ai-analytics'
    );
    
    
    if (isCronJob) {
      return {
        message: 'Sales forecasts generated successfully',
        forecasts: aiResponse
      };
    }
    
    
    res.json({
      message: 'Sales forecasts generated successfully',
      forecasts: aiResponse
    });
    
  } catch (err) {
    console.error('Error generating sales forecasts:', err);
    
    
    if (!req) throw err;
    
    
    res.status(500).json({ 
      message: 'Error generating sales forecasts', 
      error: err.message 
    });
  }
};

/**
 * Get AI recommendations for business optimization
 */
exports.getRecommendations = async (req, res) => {
  try {
    
    const isCronJob = !req;
    const useCache = req && req.query.useCache === 'true';
    
    if (useCache) {
      
      const cacheSql = `
        SELECT response_data, created_at
        FROM ai_interactions
        WHERE type = 'business_recommendations'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const cacheResult = await query(cacheSql);
      
      if (cacheResult.rows.length > 0) {
        return res.json({
          message: 'Retrieved cached business recommendations',
          recommendations: cacheResult.rows[0].response_data,
          cached: true,
          timestamp: cacheResult.rows[0].created_at
        });
      }
    }
    
    
    const recentSalesSql = `
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as items_sold,
        SUM(o.total_amount) as total_revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at > NOW() - INTERVAL '30 days'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `;
    
    const recentSalesResult = await query(recentSalesSql);
    
    
    const lowStockSql = `
      SELECT COUNT(*) as count
      FROM products
      WHERE stock_quantity < 10
    `;
    
    const lowStockResult = await query(lowStockSql);
    
    
    const popularProductsSql = `
      SELECT 
        p.id, p.name, p.category_id, c.name as category_name,
        SUM(oi.quantity) as quantity_sold
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at > NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.category_id, c.name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `;
    
    const popularProductsResult = await query(popularProductsSql);
    
    
    const businessData = {
      recent_sales_by_category: recentSalesResult.rows,
      low_stock_count: parseInt(lowStockResult.rows[0].count),
      popular_products: popularProductsResult.rows
    };
    
    
    const prompt = {
      role: "system",
      content: `You are an AI business consultant analyzing sales and inventory data.
      Based on the provided business data, generate strategic recommendations for:
      1. Inventory optimization
      2. Sales enhancement
      3. Category management
      4. Business growth opportunities
      
      Provide your recommendations in JSON format with these sections: inventory_optimization, 
      sales_enhancement, category_management, growth_opportunities. Each should contain an array of 
      recommendation objects with title, description, and priority (high, medium, low).`
    };

    const aiResponse = await requestOpenAI(prompt, businessData);
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'Failed to generate business recommendations',
        recommendations: {}
      });
    }
    
    
    await saveAIInteraction('business_recommendations', businessData, aiResponse);
    
    
    await saveAIAction('business_recommendation', {
      summary: 'Business optimization recommendations',
      category_insights: businessData.recent_sales_by_category.length,
      recommendation_count: (
        (aiResponse.inventory_optimization?.length || 0) +
        (aiResponse.sales_enhancement?.length || 0) +
        (aiResponse.category_management?.length || 0) +
        (aiResponse.growth_opportunities?.length || 0)
      )
    });
    
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Business Recommendations Ready',
      'AI has analyzed your business data and provided strategic recommendations.',
      '/ai-analytics'
    );
    
    
    if (isCronJob) {
      return {
        message: 'Business recommendations generated successfully',
        recommendations: aiResponse
      };
    }
    
    
    res.json({
      message: 'Business recommendations generated successfully',
      recommendations: aiResponse
    });
    
  } catch (err) {
    console.error('Error generating business recommendations:', err);
    
    
    if (!req) throw err;
    
    
    res.status(500).json({ 
      message: 'Error generating business recommendations', 
      error: err.message 
    });
  }
};

/**
 * Process a stock order after a product sale
 */
exports.processStockOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    console.log(`[INFO] Starting AI analysis for order #${order_id}`);
    
    
    const orderSql = `
      SELECT o.id, o.order_number, o.created_at, o.status,
        json_agg(json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku,
          'quantity', oi.quantity,
          'stock_quantity', p.stock_quantity,
          'pending_order_quantity', (
            SELECT COALESCE(SUM(soi.quantity), 0)
            FROM supplier_order_items soi
            JOIN supplier_orders so ON soi.supplier_order_id = so.id
            WHERE soi.product_id = p.id AND so.status = 'pending'
          ),
          'category_id', p.category_id,
          'category_name', c.name
        )) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.id = $1
      GROUP BY o.id, o.order_number, o.created_at, o.status
    `;
    
    const orderResult = await query(orderSql, [order_id]);
    
    if (orderResult.rows.length === 0) {
      console.log(`[ERROR] Order #${order_id} not found for AI analysis`);
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    console.log(`[INFO] Found order #${order_id} with ${order.items.length} items for analysis`);
    
    
    const productIds = order.items.map(item => item.id);
    
    const historySql = `
      SELECT 
        oi.product_id,
        DATE_TRUNC('month', o.created_at) as month,
        SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ANY($1)
      AND o.created_at > NOW() - INTERVAL '6 months'
      GROUP BY oi.product_id, DATE_TRUNC('month', o.created_at)
      ORDER BY oi.product_id, month
    `;
    
    const historyResult = await query(historySql, [productIds]);
    console.log(`[INFO] Retrieved ${historyResult.rows.length} history records for sales analysis`);
    
    
    const productHistory = {};
    historyResult.rows.forEach(row => {
      if (!productHistory[row.product_id]) {
        productHistory[row.product_id] = [];
      }
      
      productHistory[row.product_id].push({
        month: row.month,
        quantity_sold: parseInt(row.quantity_sold)
      });
    });
    
    
    const orderWithHistory = {
      ...order,
      items: order.items.map(item => {
        
        const effectiveStock = parseInt(item.stock_quantity) + parseInt(item.pending_order_quantity || 0);
        
        return {
          ...item,
          effective_stock: effectiveStock,
          pending_orders: parseInt(item.pending_order_quantity || 0),
          sales_history: productHistory[item.id] || []
        };
      })
    };
    
    
    const prompt = {
      role: "system",
      content: `You are an AI inventory management system. After this order, analyze if any products 
      need restocking based on current stock levels, sales history, and the quantities just sold.
      
      Note that some products may already have pending orders. The effective_stock field includes 
      both current stock_quantity and pending_order_quantity. Consider both values in your analysis.
      
      When a product has significant pending orders, you should reduce or eliminate the recommended order quantity.
      
      For each product that needs restocking, provide:
      1. Recommended restock quantity
      2. Priority level (urgent, high, medium, low)
      3. Reasoning for recommendation

      Keep in mind seasonal trends and recent sales velocity. Provide your response in JSON format with an array of 
      restock_recommendations containing: product_id, name, current_stock, effective_stock, pending_orders, 
      recommended_quantity, priority, reasoning.`
    };

    console.log(`[INFO] Sending AI request for post-sale analysis of order #${order_id}`);
    const aiResponse = await requestOpenAI(prompt, { order: orderWithHistory });
    
    if (!aiResponse) {
      console.log(`[ERROR] Failed to get AI recommendations for order #${order_id}`);
      return res.status(500).json({ 
        message: 'Failed to generate restock recommendations',
        recommendations: []
      });
    }
    
    console.log(`[INFO] Received AI recommendations for order #${order_id}:`, 
      JSON.stringify(aiResponse).substring(0, 200) + '...');
    
    
    await saveAIInteraction('post_sale_analysis', { order: orderWithHistory }, aiResponse);
    
    
    console.log(`[INFO] Processing urgent restock recommendations for order #${order_id}`);
    const reorderResults = await processUrgentRestockRecommendations(
      aiResponse.restock_recommendations || aiResponse
    );
    
    console.log(`[INFO] Reorder processing results:`, reorderResults);
    
    
    await notificationController.createSystemNotification({
      title: 'Order Analysis Completed',
      message: `AI has analyzed order #${order_id} and provided restock recommendations.`,
      type: 'ai_order_analysis',
      action_link: `/orders/${order_id}`,
      reference_id: order_id,
      reference_type: 'order',
      is_global: true
    });
    
    
    if (reorderResults && reorderResults.length > 0) {
      console.log(`[INFO] ${reorderResults.length} automatic supplier orders created`);
      reorderResults.forEach(result => {
        notificationController.createSystemNotification({
          title: 'AI Created Supplier Order',
          message: `AI automatically created supplier order #${result.orderId} for ${result.supplierName}`,
          type: 'ai_auto_order',
          action_link: `/supplier-orders`,
          reference_id: result.orderId,
          reference_type: 'supplier_order',
          is_global: true
        });
      });
    } else {
      console.log(`[INFO] No automatic supplier orders were needed`);
    }
    
    res.json({
      message: 'Post-sale analysis completed successfully',
      restock_recommendations: aiResponse,
      automated_orders: reorderResults
    });
    
  } catch (err) {
    console.error('[ERROR] Error processing post-sale analysis:', err);
    res.status(500).json({ 
      message: 'Error processing post-sale analysis', 
      error: err.message 
    });
  }
};

/**
 * Run scheduled inventory analysis (for cron job)
 */
exports.runScheduledInventoryAnalysis = async (req, res) => {
  try {
    
    const inventorySql = `
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.price, 
        p.stock_quantity, 
        c.name as category_name,
        COALESCE(
          (SELECT SUM(soi.quantity) 
           FROM supplier_order_items soi
           JOIN supplier_orders so ON soi.supplier_order_id = so.id
           WHERE soi.product_id = p.id AND so.status = 'pending'),
           0
        ) as pending_order_quantity,
        (SELECT SUM(oi.quantity) FROM order_items oi 
         JOIN orders o ON oi.order_id = o.id 
         WHERE oi.product_id = p.id AND o.created_at > NOW() - INTERVAL '30 days') as quantity_sold_30d
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `;
    
    const inventoryResult = await query(inventorySql);
    
    
    const enhancedInventory = inventoryResult.rows.map(product => {
      const effectiveStock = parseInt(product.stock_quantity) + parseInt(product.pending_order_quantity || 0);
      
      return {
        ...product,
        effective_stock: effectiveStock,
        pending_orders: parseInt(product.pending_order_quantity || 0)
      };
    });
    
    
    const prompt = {
      role: "system",
      content: `You are an AI inventory management system performing a scheduled analysis of the entire inventory.
      Identify products that:
      1. Need immediate restocking (critically low)
      2. Will need restocking soon based on sales velocity
      3. Are overstocked and might need promotions
      4. Show unusual patterns requiring attention
      
      Note that some products may already have pending orders. The effective_stock field includes 
      both current stock_quantity and pending_order_quantity. Consider both values in your analysis.
      
      When a product has significant pending orders, it may not need immediate restocking even if current_stock is low.
      
      Provide your analysis in JSON format with these sections:
      - critical_restock_needed: array of products needing immediate restocking
      - upcoming_restock_needed: array of products that will need restocking soon
      - overstocked_products: array of products with excess inventory
      - unusual_patterns: array of products showing abnormal stock or sales patterns

      Each product object should include: id, name, current_stock, effective_stock, pending_orders, recommendation, reasoning.`
    };

    const aiResponse = await requestOpenAI(prompt, { inventory: enhancedInventory });
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'Failed to generate scheduled inventory analysis',
        analysis: {}
      });
    }
    
    
    await saveAIInteraction('scheduled_inventory_analysis', 
      { inventory: inventoryResult.rows }, aiResponse);
    
    
    let orderResults = [];
    if (aiResponse.critical_restock_needed && 
        Array.isArray(aiResponse.critical_restock_needed) && 
        aiResponse.critical_restock_needed.length > 0) {
      orderResults = await processUrgentRestockRecommendations(aiResponse.critical_restock_needed);
    }
    
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Inventory Analysis Completed',
      'AI has completed a scheduled analysis of your inventory.',
      '/ai-action-history'
    );
    
    
    
    
    if (!res) return;
    
    res.json({
      message: 'Scheduled inventory analysis completed successfully',
      analysis: aiResponse
    });
    
  } catch (err) {
    console.error('Error running scheduled inventory analysis:', err);
    if (res) {
      res.status(500).json({ 
        message: 'Error running scheduled inventory analysis', 
        error: err.message 
      });
    }
  }
};

/**
 * Create a supplier order based on AI recommendation
 */
async function processUrgentRestockRecommendations(recommendations) {
  try {
    console.log(`[INFO] Processing urgent restock recommendations:`, 
      JSON.stringify(recommendations).substring(0, 200) + '...');
    
    
    let itemsToProcess = [];
    
    if (Array.isArray(recommendations)) {
      
      itemsToProcess = recommendations;
    } else if (recommendations.restock_recommendations && Array.isArray(recommendations.restock_recommendations)) {
      
      itemsToProcess = recommendations.restock_recommendations;
    } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
      
      itemsToProcess = recommendations.recommendations;
    } else if (recommendations.items && Array.isArray(recommendations.items)) {
      
      itemsToProcess = recommendations.items;
    } else {
      
      const arrayProps = Object.keys(recommendations).filter(key => Array.isArray(recommendations[key]));
      if (arrayProps.length > 0) {
        
        itemsToProcess = recommendations[arrayProps[0]];
      } else {
        console.log('[WARN] Could not find any array of recommendations in the AI response');
        return [];
      }
    }
    
    console.log(`[INFO] Found ${itemsToProcess.length} items to evaluate for restocking`);
    
    
    let urgentItems = itemsToProcess.filter(item => 
      (item.priority === 'urgent' || item.priority === 'high') &&
      (item.product_id || item.id) 
    );
    
    
    if (urgentItems.length === 0) {
      console.log('[INFO] No urgent/high priority items found. Checking for medium priority items.');
      urgentItems = itemsToProcess.filter(item => 
        item.priority === 'medium' && 
        (item.product_id || item.id)
      );
      
      
      if (urgentItems.length === 0) {
        console.log('[INFO] No medium priority items found. Checking for any items with low stock.');
        urgentItems = itemsToProcess.filter(item => 
          ((item.current_stock !== undefined && item.current_stock < 5) || 
           (item.stock_quantity !== undefined && item.stock_quantity < 5)) &&
          (item.product_id || item.id)
        );
      }
    }
    
    console.log(`[INFO] Found ${urgentItems.length} items that need restocking out of ${itemsToProcess.length} total recommendations`);
    
    if (urgentItems.length === 0) {
      console.log('[INFO] No items identified for restocking');
      return [];
    }
    
    
    urgentItems = urgentItems.map(item => ({
      ...item,
      product_id: item.product_id || item.id,
      recommended_quantity: item.recommended_quantity || item.quantity || Math.max(10, item.current_stock * 2)
    }));
    
    
    const productIds = urgentItems.map(item => item.product_id);
    console.log(`[INFO] Urgent product IDs:`, productIds);
    
    
    console.log('[INFO] Fetching supplier information from products table');
    const supplierSql = `
      SELECT 
        p.id as product_id, 
        p.supplier_id, 
        s.name as supplier_name
      FROM 
        products p
      JOIN 
        suppliers s ON p.supplier_id = s.id
      WHERE 
        p.id = ANY($1) AND p.supplier_id IS NOT NULL
    `;
    
    const supplierResult = await query(supplierSql, [productIds]);
    console.log(`[INFO] Found supplier information for ${supplierResult.rows.length} products`);
    
    
    const productsWithoutSupplier = productIds.filter(id => 
      !supplierResult.rows.some(row => row.product_id == id)
    );
    
    if (productsWithoutSupplier.length > 0) {
      console.log(`[INFO] ${productsWithoutSupplier.length} products don't have a supplier assigned and will be skipped:`, productsWithoutSupplier);
    }
    
    
    const supplierGroups = {};
    
    supplierResult.rows.forEach(product => {
      if (!supplierGroups[product.supplier_id]) {
        supplierGroups[product.supplier_id] = {
          supplier_id: product.supplier_id,
          supplier_name: product.supplier_name,
          products: []
        };
      }
      
      const recommendation = urgentItems.find(item => item.product_id == product.product_id);
      
      if (recommendation) {
        supplierGroups[product.supplier_id].products.push({
          product_id: product.product_id,
          quantity: recommendation.recommended_quantity || Math.ceil(recommendation.current_stock * 0.5)
        });
      }
    });
    
    console.log(`[INFO] Grouped products into ${Object.keys(supplierGroups).length} supplier orders`);
    
    const results = [];
    
    for (const supplierId in supplierGroups) {
      const order = supplierGroups[supplierId];
      
      if (order.products.length === 0) {
        console.log(`[WARN] No products to order for supplier ${supplierId}`);
        continue;
      }
      
      console.log(`[INFO] Creating order for supplier ${order.supplier_name} with ${order.products.length} products`);
      
      
      const productIds = order.products.map(p => p.product_id);
      const pricesSql = `SELECT id, price, name FROM products WHERE id = ANY($1)`;
      const pricesResult = await query(pricesSql, [productIds]);
      
      
      let totalAmount = 0;
      
      
      order.items = order.products.map(item => {
        const productInfo = pricesResult.rows.find(p => p.id == item.product_id);
        const unitPrice = productInfo ? parseFloat(productInfo.price) : 0;
        const totalPrice = unitPrice * item.quantity;
        
        totalAmount += totalPrice;
        
        return {
          ...item,
          unit_price: unitPrice,
          total_price: totalPrice,
          product_name: productInfo ? productInfo.name : `Product ${item.product_id}`
        };
      });
      
      console.log(`[INFO] Order total: ${totalAmount} for supplier ${order.supplier_name}`);
      
      
      const createOrderSql = `
        INSERT INTO supplier_orders (
          supplier_id, status, total_amount, notes, created_by, is_ai_created
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const orderResult = await query(createOrderSql, [
        supplierId,
        'pending',
        totalAmount,
        'Automatically created by AI system based on inventory analysis and seasonal trends',
        null, 
        true  
      ]);
      
      const orderId = orderResult.rows[0].id;
      console.log(`[INFO] Created supplier order #${orderId} for supplier ${order.supplier_name}`);
      
      
      for (const item of order.items) {
        const createItemSql = `
          INSERT INTO supplier_order_items (
            supplier_order_id, product_id, quantity, unit_price, total_price
          )
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await query(createItemSql, [
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);
        
        console.log(`[INFO] Added product ${item.product_id} to order #${orderId}, quantity: ${item.quantity}`);
      }
      
      
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      const currentSeason = getSeason(currentDate);
      
      
      await saveAIAction('create_supplier_order', {
        supplier_id: supplierId,
        supplier_name: order.supplier_name,
        order_id: orderId,
        items: order.items,
        total_amount: totalAmount,
        is_ai_created: true,
        seasonality_factors: {
          month: currentMonth,
          season: currentSeason,
          is_holiday_season: isHolidaySeason(currentDate),
        },
        reasoning: `AI automatically ordered products based on stock levels, current season (${currentSeason}), and recent sales velocity.`
      });
      
      results.push({
        supplierId,
        supplierName: order.supplier_name,
        orderId,
        items: order.items.length,
        amount: totalAmount,
        isAiCreated: true
      });
    }
    
    console.log(`[INFO] Created ${results.length} supplier orders automatically`);
    return results;
  } catch (err) {
    console.error('[ERROR] Error processing urgent restock recommendations:', err);
    return [];
  }
}


function getSeason(date) {
  const month = date.getMonth() + 1; 
  
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}


function isHolidaySeason(date) {
  const month = date.getMonth() + 1;
  return month >= 11 || month === 12 || month === 1; 
}

/**
 * Helper function to make OpenAI API calls
 */
async function requestOpenAI(systemPrompt, data) {
  try {
    
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not set, returning mock data');
      return createMockResponse(systemPrompt.content, data);
    }
    
    const userPrompt = {
      role: "user",
      content: `Here is the data to analyze: ${JSON.stringify(data, null, 2)}`
    };
    
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [systemPrompt, userPrompt],
      temperature: 0.7,
      max_tokens: 2000,
      store: true,
      response_format: { type: "json_object" }
    };
    
    console.log('Sending request to OpenAI...');
    console.log('Request URL:', OPENAI_API_URL);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(OPENAI_API_URL, requestBody, { headers });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('Response received from OpenAI:', content.substring(0, 200) + '...');
      
      try {
        
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response as JSON:', parseError);
        console.log('Raw response:', content);
        return null;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error calling OpenAI API:', err.response?.data || err.message);
    
    
    if (USE_MOCK_ON_RATE_LIMIT && 
        err.response?.data?.error?.code === 'rate_limit_exceeded') {
      console.warn('OpenAI rate limit exceeded, falling back to mock data');
      return createMockResponse(systemPrompt.content, data);
    }
    
    return null;
  }
}

/**
 * Save AI interaction to database
 */
async function saveAIInteraction(type, request, response) {
  try {
    const sql = `
      INSERT INTO ai_interactions (
        type, request_data, response_data, created_at
      )
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const result = await query(sql, [
      type,
      JSON.stringify(request),
      JSON.stringify(response)
    ]);
    
    console.log(`Saved AI interaction #${result.rows[0].id} of type ${type}`);
    
    return result.rows[0].id;
  } catch (err) {
    console.error('Error saving AI interaction:', err);
    return null;
  }
}

/**
 * Save AI-initiated action to database
 */
async function saveAIAction(action_type, action_data) {
  try {
    const sql = `
      INSERT INTO ai_actions (
        action_type, action_data, created_at
      )
      VALUES ($1, $2, NOW())
      RETURNING id
    `;
    
    const result = await query(sql, [
      action_type,
      JSON.stringify(action_data)
    ]);
    
    console.log(`Saved AI action #${result.rows[0].id} of type ${action_type}`);
    
    return result.rows[0].id;
  } catch (err) {
    console.error('Error saving AI action:', err);
    return null;
  }
}

/**
 * Create mock response for development without OpenAI API
 */
function createMockResponse(promptContent, data) {
  console.log('Creating mock response for:', promptContent.substring(0, 50) + '...');
  
  
  if (promptContent.includes('stock prediction') || promptContent.includes('inventory management')) {
    const mockProducts = [];
    
    
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach(product => {
        const currentStock = product.stock_quantity || 5;
        const minStock = product.min_stock_quantity || 10;
        const salesHistory = product.sales_history || [];
        
        
        let recommendedQuantity = 0;
        if (salesHistory.length > 0) {
          
          const recentSales = salesHistory.slice(-3);
          const totalSold = recentSales.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0);
          recommendedQuantity = Math.ceil(totalSold / Math.max(1, recentSales.length)) * 2;
        } else {
          
          recommendedQuantity = Math.max(10, minStock * 2 - currentStock);
        }
        
        
        let priority = 'medium';
        if (currentStock === 0) priority = 'urgent';
        else if (currentStock < minStock / 2) priority = 'high';
        else if (currentStock > minStock * 1.5) priority = 'low';
        
        mockProducts.push({
          product_id: product.id,
          name: product.name,
          recommended_order_quantity: recommendedQuantity,
          minimum_stock_level: Math.max(minStock, Math.ceil(recommendedQuantity * 0.3)),
          priority: priority,
          reasoning: `Mock analysis based on current stock of ${currentStock} units compared to minimum stock of ${minStock} units.`
                    + (salesHistory.length > 0 ? ` Recent sales trends indicate moderate demand.` : '')
        });
      });
    }
    
    
    if (mockProducts.length === 0) {
      mockProducts.push(
        {
          product_id: 1,
          name: "Product 1",
          recommended_order_quantity: 50,
          minimum_stock_level: 20,
          priority: "high",
          reasoning: "Sales have been consistent with slight growth. Recommend restocking to prepare for upcoming demand."
        },
        {
          product_id: 2,
          name: "Product 2",
          recommended_order_quantity: 30,
          minimum_stock_level: 15,
          priority: "medium",
          reasoning: "Sales are declining slightly, but this is likely seasonal. Moderate restocking recommended."
        }
      );
    }
    
    return {
      predictions: mockProducts
    };
  }
  
  
  if (promptContent.includes('sales forecast')) {
    return {
      forecasts: [
        {
          product_id: 1,
          name: "Product 1",
          forecasted_months: [
            { month: "2023-07", quantity: 45, revenue: 2250 },
            { month: "2023-08", quantity: 50, revenue: 2500 },
            { month: "2023-09", quantity: 55, revenue: 2750 }
          ],
          growth_trend: "Upward",
          seasonal_factors: "Higher demand expected in Q3 based on historical patterns"
        }
      ]
    };
  }
  
  if (promptContent.includes('business consultant')) {
    return {
      inventory_optimization: [
        {
          title: "Implement JIT for top products",
          description: "For the top 20% of products, implement Just-In-Time inventory to reduce carrying costs",
          priority: "high"
        }
      ],
      sales_enhancement: [
        {
          title: "Bundle slow-moving items",
          description: "Create product bundles that pair fast-selling items with slower-moving inventory",
          priority: "medium"
        }
      ],
      category_management: [
        {
          title: "Expand Electronics Category",
          description: "Based on growth trends, consider expanding the electronics category with more diverse products",
          priority: "high"
        }
      ],
      growth_opportunities: [
        {
          title: "Seasonal promotion planning",
          description: "Prepare targeted promotions for upcoming seasonal peaks in the following categories...",
          priority: "medium"
        }
      ]
    };
  }
  
  
  return {
    message: "This is a mock AI response for development purposes",
    analysis: "The data provided suggests normal operation with no critical issues",
    recommendations: [
      "Consider reviewing inventory levels for seasonal adjustments",
      "Monitor sales trends for Products 3, 7 and 12 which show unusual patterns"
    ]
  };
}

/**
 * Get recent AI actions for dashboard
 */
exports.getRecentAIActions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const sql = `
      SELECT id, action_type, action_data, created_at
      FROM ai_actions
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await query(sql, [limit]);
    
    res.json({
      message: 'AI actions retrieved successfully',
      actions: result.rows
    });
  } catch (err) {
    console.error('Error retrieving AI actions:', err);
    res.status(500).json({
      message: 'Error retrieving AI actions',
      error: err.message
    });
  }
};

/**
 * Get recent AI interactions for history view
 */
exports.getAIInteractions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    
    let sql = `
      SELECT id, type, request_data, response_data, created_at
      FROM ai_interactions
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type) {
      sql += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await query(sql, params);
    
    
    let countSql = `SELECT COUNT(*) FROM ai_interactions WHERE 1=1`;
    if (type) {
      countSql += ` AND type = $1`;
    }
    
    const countResult = await query(countSql, type ? [type] : []);
    const total = parseInt(countResult.rows[0].count) || 0;
    
    res.json({
      message: 'AI interactions retrieved successfully',
      interactions: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error retrieving AI interactions:', err);
    res.status(500).json({
      message: 'Error retrieving AI interactions',
      error: err.message
    });
  }
};

/**
 * Get latest AI analysis results from database
 */
exports.getLatestAnalytics = async (req, res) => {
  try {
    
    const sql = `
      WITH ranked_interactions AS (
        SELECT 
          type, 
          response_data, 
          created_at,
          ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at DESC) as rn
        FROM ai_interactions
        WHERE type IN ('stock_prediction', 'sales_forecast', 'business_recommendations')
      )
      SELECT type, response_data, created_at
      FROM ranked_interactions
      WHERE rn = 1
    `;
    
    const result = await query(sql);
    
    
    const responseData = {
      stockPredictions: null,
      salesForecasts: null,
      recommendations: null
    };
    
    result.rows.forEach(row => {
      if (row.type === 'stock_prediction') {
        responseData.stockPredictions = {
          predictions: row.response_data,
          timestamp: row.created_at
        };
      } else if (row.type === 'sales_forecast') {
        responseData.salesForecasts = {
          forecasts: row.response_data,
          timestamp: row.created_at
        };
      } else if (row.type === 'business_recommendations') {
        responseData.recommendations = {
          recommendations: row.response_data,
          timestamp: row.created_at
        };
      }
    });
    
    res.json({
      message: 'Latest AI analytics retrieved successfully',
      data: responseData
    });
    
  } catch (err) {
    console.error('Error retrieving latest AI analytics:', err);
    res.status(500).json({
      message: 'Error retrieving latest AI analytics',
      error: err.message
    });
  }
};

/**
 * Apply AI suggested minimum stock levels and create orders if needed
 */
exports.applyStockPredictions = async (req, res) => {
  try {
    const { predictions, predictionId } = req.body;
    
    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid predictions data. Expected an array of predictions.',
        success: false
      });
    }

    
    let originalPrediction = null;
    if (predictionId) {
      const interactionSql = `
        SELECT id, type, request_data, response_data
        FROM ai_interactions
        WHERE id = $1 AND type = 'stock_prediction'
      `;
      
      const interactionResult = await query(interactionSql, [predictionId]);
      if (interactionResult.rows.length > 0) {
        originalPrediction = interactionResult.rows[0];
      }
    }

    const results = {
      updated_products: [],
      created_orders: [],
      errors: []
    };
    
    
    for (const prediction of predictions) {
      try {
        const { 
          product_id, 
          minimum_stock_level, 
          recommended_order_quantity,
          priority 
        } = prediction;
        
        if (!product_id) {
          results.errors.push({
            message: 'Missing product_id in prediction',
            prediction
          });
          continue;
        }

        
        if (minimum_stock_level && minimum_stock_level > 0) {
          const updateSql = `
            UPDATE products 
            SET min_stock_quantity = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, min_stock_quantity
          `;
          
          const updateResult = await query(updateSql, [minimum_stock_level, product_id]);
          
          if (updateResult.rows.length > 0) {
            results.updated_products.push({
              product_id,
              name: updateResult.rows[0].name,
              new_min_stock_level: updateResult.rows[0].min_stock_quantity
            });
          }
        }
        
        
        if (recommended_order_quantity && recommended_order_quantity > 0 && 
            (priority === 'high' || priority === 'urgent')) {
          
          
          const productSql = `
            SELECT p.id, p.name, p.price, p.supplier_id, s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1
          `;
          
          const productResult = await query(productSql, [product_id]);
          
          if (productResult.rows.length === 0) {
            results.errors.push({
              message: `Product with ID ${product_id} not found`,
              prediction
            });
            continue;
          }
          
          const product = productResult.rows[0];
          
          
          if (!product.supplier_id) {
            results.errors.push({
              message: `Product ${product.name} (ID: ${product_id}) doesn't have a supplier assigned`,
              prediction
            });
            continue;
          }
          
          
          const unitPrice = parseFloat(product.price);
          const totalPrice = unitPrice * recommended_order_quantity;
          
          
          const createOrderSql = `
            INSERT INTO supplier_orders (
              supplier_id, status, total_amount, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `;
          
          const orderResult = await query(createOrderSql, [
            product.supplier_id,
            'pending',
            totalPrice,
            'Created from AI prediction application',
            req.user ? req.user.id : null
          ]);
          
          const orderId = orderResult.rows[0].id;
          
          
          const createItemSql = `
            INSERT INTO supplier_order_items (
              supplier_order_id, product_id, quantity, unit_price, total_price
            )
            VALUES ($1, $2, $3, $4, $5)
          `;
          
          await query(createItemSql, [
            orderId,
            product_id,
            recommended_order_quantity,
            unitPrice,
            totalPrice
          ]);
          
          
          results.created_orders.push({
            supplier_order_id: orderId,
            supplier_id: product.supplier_id,
            supplier_name: product.supplier_name,
            product_id,
            product_name: product.name,
            quantity: recommended_order_quantity,
            total_amount: totalPrice
          });
          
          
          await saveAIAction('apply_ai_recommendation', {
            action: 'create_supplier_order',
            supplier_order_id: orderId,
            supplier_name: product.supplier_name,
            product_id,
            product_name: product.name,
            quantity: recommended_order_quantity,
            total_amount: totalPrice,
            applied_by: req.user ? req.user.id : 'system'
          });
          
          
          await triggerNotifications.aiSupplierOrderNotification(
            { id: orderId }, 
            product.supplier_name, 
            product.supplier_id
          );
        }
      } catch (itemError) {
        console.error(`Error processing prediction for product ${prediction.product_id}:`, itemError);
        results.errors.push({
          message: `Error processing prediction: ${itemError.message}`,
          prediction
        });
      }
    }
    
    
    await saveAIAction('apply_stock_predictions', {
      updated_products: results.updated_products.length,
      created_orders: results.created_orders.length,
      errors: results.errors.length,
      applied_by: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'system',
      prediction_id: predictionId || null
    });
    
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Recommendations Applied',
      `${results.updated_products.length} products updated and ${results.created_orders.length} orders created based on AI recommendations.`,
      '/ai-action-history'
    );
    
    res.json({
      message: 'Stock predictions applied successfully',
      results,
      success: true
    });
    
  } catch (err) {
    console.error('Error applying stock predictions:', err);
    res.status(500).json({ 
      message: 'Error applying stock predictions', 
      error: err.message,
      success: false
    });
  }
}; 