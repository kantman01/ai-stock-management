require('dotenv').config();
const { query } = require('./config/db');
const aiController = require('./controllers/aiController');

async function testOrderProcessing() {
  try {
    console.log('Starting manual test for order processing and AI supplier order generation');
    
    
    const orderIdResult = await query(
      'SELECT id FROM orders ORDER BY created_at DESC LIMIT 1'
    );
    
    if (orderIdResult.rows.length === 0) {
      console.log('No orders found in the database.');
      process.exit(1);
    }
    
    const orderId = orderIdResult.rows[0].id;
    console.log(`Testing with the most recent order: #${orderId}`);
    
    
    const req = {
      params: { order_id: orderId },
      headers: { authorization: 'Bearer mock_token' },
      protocol: 'http',
      get: (name) => name === 'host' ? 'localhost:5001' : ''
    };
    
    let responseData = null;
    const res = {
      status: (code) => {
        console.log(`Response status code: ${code}`);
        return {
          json: (data) => {
            responseData = data;
            console.log('Response data:', JSON.stringify(data, null, 2));
          }
        };
      },
      json: (data) => {
        responseData = data;
        console.log('Response data:', JSON.stringify(data, null, 2));
      }
    };
    
    
    console.log('Calling AI order processing...');
    await aiController.processStockOrder(req, res);
    
    console.log('Test completed');
    
    
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
    
    process.exit(0);
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

testOrderProcessing(); 