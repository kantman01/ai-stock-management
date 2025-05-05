require('dotenv').config();
const { query } = require('./backend/config/db');
const aiController = require('./backend/controllers/aiController');

async function testAISupplierSelection() {
  try {
    console.log('Starting manual test for AI supplier selection');
    
    
    const recommendations = {
      restock_recommendations: [
        {
          product_id: 1, 
          name: "Test Product",
          current_stock: 3,
          recommended_quantity: 20,
          priority: "high",
          reasoning: "Stock level is critically low and this is a high-demand product."
        }
      ]
    };
    
    console.log('Testing processUrgentRestockRecommendations with test data...');
    
    
    const results = await aiController.processUrgentRestockRecommendations(recommendations);
    
    console.log('Results:', results);
    
    
    const newOrdersResult = await query(`
      SELECT so.id, so.supplier_id, so.status, so.total_amount, so.is_ai_created,
             s.name as supplier_name, 
             (SELECT COUNT(*) FROM supplier_order_items WHERE supplier_order_id = so.id) as item_count
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      WHERE so.created_at > NOW() - INTERVAL '1 minute' AND so.is_ai_created = true
      ORDER BY so.created_at DESC
    `);
    
    if (newOrdersResult.rows.length === 0) {
      console.log('No new AI supplier orders were created in the last minute.');
    } else {
      console.log(`${newOrdersResult.rows.length} new AI supplier orders created in the last minute:`);
      newOrdersResult.rows.forEach(order => {
        console.log(`- Order #${order.id} for ${order.supplier_name}: ${order.item_count} items, $${order.total_amount}`);
      });
    }
    
    
    const productResult = await query(`
      SELECT p.id, p.name, p.preferred_supplier_id, s.name AS preferred_supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      WHERE p.id = $1 and p.is_active = true
    `, [recommendations.restock_recommendations[0].product_id]);
    
    if (productResult.rows.length > 0) {
      const product = productResult.rows[0];
      console.log(`Product #${product.id} (${product.name}) preferred supplier:`, 
        product.preferred_supplier_id 
          ? `#${product.preferred_supplier_id} - ${product.preferred_supplier_name}`
          : 'None');
    }
    
    console.log('Test completed');
    process.exit(0);
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

testAISupplierSelection(); 