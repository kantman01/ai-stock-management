const { query } = require('../config/db'); // Bu fonksiyon, veritabanı üzerinde SQL sorguları çalıştırmak için kullanılır.
const axios = require('axios'); // HTTP istekleri için axios modülü kullanılır, OpenAI API’ye istek atmak için axios kullanılır.
require('dotenv').config(); // Ortam değişkenlerini .env dosyasından alabilmek için dotenv paketi çağrılır.
const notificationController = require('./notificationController');
const triggerNotifications = require('../utils/triggerNotifications');


console.log('[DEBUG] Environment variables:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'not set, using default'}`);
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'is set' : 'NOT SET'}`);
if (process.env.OPENAI_API_KEY) {
  console.log(`    Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 3)}... and is ${process.env.OPENAI_API_KEY.length} characters long`);
}

//Bu kısım sadece geliştiricinin doğru yapılandırmayı kontrol etmesi içindir.

const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || false;

console.log(`[DEBUG] Development mode: ${DEVELOPMENT_MODE}`);
console.log(`[DEBUG] Using mock data: ${USE_MOCK_DATA}`);


const OPENAI_API_KEY = USE_MOCK_DATA ? null : process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'; 

// OpenAI API'nin uç noktası (endpoint) tanımlanır.
//Bu URL daha sonra axios.post(OPENAI_API_URL, {...}) gibi fonksiyonlarla kullanılır.


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
    // İstek parametrelerinde 'useCache' true ise, önbelleği kullan.

    
    if (useCache) { 
    // En son kaydedilen AI tahminini veritabanından al.
      
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
    
     // Düşük stoklu ürünleri analiz etmek için SQL sorgusu.
    const stockAnalysisSql = `
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
      WHERE p.is_active = true
        AND (p.stock_quantity < p.min_stock_quantity * 2)
        AND EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.product_id = p.id
        )
      ORDER BY (p.stock_quantity * 1.0 / NULLIF(p.min_stock_quantity, 0)) ASC
      LIMIT 20
    `;
    
//Bu sorgu, aktif ürünler arasından stok seviyesi minimum stok seviyesinin iki katından az olan ve en az bir siparişi bulunan ürünleri seçer.
//Ayrıca, her ürün için bekleyen sipariş miktarı da hesaplanır.

    const stockResult = await query(stockAnalysisSql);
    
    if (stockResult.rows.length === 0) {
      return res.json({
        message: 'No products need stock replenishment currently.',
        predictions: []
      });
    }

    // Seçilen ürünlerin geçmiş satış verilerini almak için SQL sorgusu.
    const productIds = stockResult.rows.map(p => p.id);
    const historySql = `
      SELECT oi.product_id, 
        DATE_TRUNC('month', o.created_at) as month,
        SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ANY($1)
      AND o.created_at > NOW() - INTERVAL '12 months'
      GROUP BY oi.product_id, DATE_TRUNC('month', o.created_at)
      ORDER BY oi.product_id, month
    `;
    
    const historyResult = await query(historySql, [productIds]);
    
    // Geçen ve bu yılın aynı ayına ait sezonluk satış verilerini almak için SQL sorgusu.

    const currentMonth = new Date().getMonth() + 1; 
    const currentYear = new Date().getFullYear();
    
    const seasonalSql = `
      SELECT 
        oi.product_id,
        EXTRACT(MONTH FROM o.created_at) as month,
        EXTRACT(YEAR FROM o.created_at) as year,
        SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ANY($1)
      AND (
        (EXTRACT(MONTH FROM o.created_at) = $2 AND EXTRACT(YEAR FROM o.created_at) = $3 - 1) OR
        (EXTRACT(MONTH FROM o.created_at) = $2 AND EXTRACT(YEAR FROM o.created_at) = $3)
      )
      GROUP BY oi.product_id, EXTRACT(MONTH FROM o.created_at), EXTRACT(YEAR FROM o.created_at)
      ORDER BY oi.product_id, year, month
    `;
    
    const seasonalResult = await query(seasonalSql, [productIds, currentMonth, currentYear]);
    
    
    const products = stockResult.rows.map(product => {

            // Ürünün satış geçmişini filtrele.

      const salesHistory = historyResult.rows
        .filter(row => row.product_id === product.id)
        .map(row => ({
          month: row.month,
          quantity_sold: parseInt(row.quantity_sold)
        }));
      
            // Ürünün sezonluk verilerini filtrele.

      const seasonalData = seasonalResult.rows
        .filter(row => row.product_id === product.id)
        .map(row => ({
          month: parseInt(row.month),
          year: parseInt(row.year),
          quantity_sold: parseInt(row.quantity_sold)
        }));

            // Yıl bazında büyüme oranını hesapla.

      
      let yearOverYearGrowth = null;
      const lastYearSales = seasonalData.find(d => d.year === currentYear - 1 && d.month === currentMonth);
      const thisYearSales = seasonalData.find(d => d.year === currentYear && d.month === currentMonth);
      
      if (lastYearSales && thisYearSales) {
        yearOverYearGrowth = (thisYearSales.quantity_sold - lastYearSales.quantity_sold) / lastYearSales.quantity_sold;
      }
            // Etkili stok miktarını hesapla.

      const effectiveStock = parseInt(product.stock_quantity) + parseInt(product.pending_order_quantity || 0);
      
      return {
        ...product, // Ürünün veritabanından gelen tüm mevcut bilgilerini taşı.
        effective_stock: effectiveStock, // Yukarıda hesapladığımız erişilebilir stok.
        pending_orders: parseInt(product.pending_order_quantity || 0), // Bekleyen sipariş adedi.
        sales_history: salesHistory, // Bu ürünün son 12 aydaki aylık satış verisi (tarih + adet).
        seasonal_data: seasonalData, // Bu ürünün son 12 aydaki aylık satış verisi (tarih + adet).
        year_over_year_growth: yearOverYearGrowth, // Bu ürünün son 12 aydaki aylık satış verisi (tarih + adet).
        current_month: currentMonth,
        current_year: currentYear
      };
    });

        // AI modeline gönderilecek prompt hazırlanır.

    const prompt = {
      role: "system",
      content: `You are an AI inventory management assistant helping to predict stock needs. 
      Analyze the products with low stock and their sales history to provide:
      1. Recommended order quantity based on historical sales patterns
      2. Ideal minimum stock level considering seasonal factors
      3. Whether the minimum stock level should be adjusted due to seasonal patterns
      4. Reasoning for your recommendation based on historical and seasonal demand patterns
      
      Consider these specific factors:
      - Year-over-year growth for the current month (if available)
      - Seasonal patterns and monthly fluctuations
      - Current month and upcoming seasonal events
      - The current effective stock (stock_quantity + pending_orders)
      
      When a product has significant pending orders, you should reduce or eliminate the recommended order quantity.
      
      Provide your response in JSON format with these fields: 
      - product_id: the ID of the product
      - name: product name
      - current_stock: actual current stock quantity
      - effective_stock: current stock plus pending orders
      - pending_orders: quantity on order but not received
      - recommended_order_quantity: how much to order now
      - minimum_stock_level: recommended minimum stock level
      - update_min_stock: boolean indicating if min_stock_quantity should be updated in the database
      - priority: priority level (urgent, high, medium, low)
      - reasoning: detailed explanation including seasonal factors`
    };

    const aiResponse = await requestOpenAI(prompt, { 
      products: products,
      current_season: getSeason(new Date()),
      is_holiday_season: isHolidaySeason(new Date())
    });
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'Failed to generate AI predictions',
        predictions: []
      });
    }
    
    
    await saveAIInteraction('stock_prediction', {
      products: products,
      current_stock: stockResult.rows
    }, aiResponse);
    
    //Bu işlem, yapılan AI çağrısını (prompt, veri, sonuç) ai_interactions tablosuna log olarak kaydeder.

    await saveAIAction('stock_prediction', {
      summary: `Analyzed ${products.length} products for stock levels`,
      predictions: aiResponse.predictions ? 
        (Array.isArray(aiResponse.predictions) ? aiResponse.predictions.length : 1) : 0,
      critical_items: aiResponse.predictions ? 
        (Array.isArray(aiResponse.predictions) ? 
          aiResponse.predictions.filter(p => p.priority === 'high' || p.priority === 'urgent').length : 0) : 0
    });
    
    //AI’ın yaptığı tahmine dair özet bilgi ai_actions tablosuna kaydediliyor.

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

    //“Bu ürünün stoğu çok düşük, acil ilgilenin” bildirimini gösteriyor.
    
    await triggerNotifications.systemAnnouncementNotification(
      'AI Stock Predictions Ready',
      `AI has analyzed ${products.length} products and provided stock level recommendations.`,
      '/ai-analytics'
    );
    
    //“AI analizini yaptı, şu kadar ürünle ilgili öneride bulundu.”
    //Bu bildirim, ai-analytics sayfasına yönlendirir.
    
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
    
    //API’ye gelen istekten ürün ID’si, kategori ID’si, tahmin dönemi (varsayılan: 3 ay), önbellek (cache) kullanımı alınır.

    if (useCache === 'true') {
      
    //Daha önce aynı ürün/kategori için yapılan tahminler varsa ve hala geçerliyse, bunları DB’den getirip yeniden işlem yapmadan döner.

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
      WHERE ${targetCondition} and p.is_active = true
      AND o.created_at > NOW() - INTERVAL '12 months'
      GROUP BY p.id, p.name, p.sku, c.name, DATE_TRUNC('month', o.created_at)
      ORDER BY p.id, month
    `;

    //Her bir ürün için, son 12 ayın aylık satış adedi ve gelir bilgisi toplanır.
    
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
    
    //Her ürün için monthly_sales adında bir dizi oluşturuluyor ve her ayın satış bilgisi bu dizide tutuluyor.

    const recurringOrdersSql = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        c.id as customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        EXTRACT(DAY FROM o.created_at) as day_of_month,
        COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) as months_count,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as order_count,
        MAX(o.created_at) as last_order_date,
        STRING_AGG(DISTINCT TO_CHAR(o.created_at, 'Mon-YYYY'), ', ') as order_months
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.created_at > NOW() - INTERVAL '12 months'
      GROUP BY p.id, p.name, c.id, CONCAT(c.first_name, ' ', c.last_name), EXTRACT(DAY FROM o.created_at)
      HAVING 
        COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) >= 2 AND 
        COUNT(DISTINCT o.id) >= 2
      ORDER BY months_count DESC, total_quantity DESC
    `;
    

    //Aynı müşterinin aynı ürünü belli bir düzenle sipariş edip etmediği analiz edilir.


    const recurringOrdersResult = await query(recurringOrdersSql);
    
    
    const recurringOrders = {};
    
    recurringOrdersResult.rows.forEach(row => {
      if (!recurringOrders[row.product_id]) {
        recurringOrders[row.product_id] = [];
      }
      
      recurringOrders[row.product_id].push({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        day_of_month: Math.round(parseFloat(row.day_of_month)),
        months_count: parseInt(row.months_count),
        order_count: parseInt(row.order_count),
        total_quantity: parseInt(row.total_quantity),
        last_order_date: row.last_order_date,
        order_months: row.order_months
      });
    });
    
    
    Object.keys(productMap).forEach(productId => {
      productMap[productId].recurring_orders = recurringOrders[productId] || [];
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
      
      Additionally, identify and highlight recurring customer purchase patterns:
      - Flag any products that have recurring orders from the same customers at regular intervals
      - Include details about these recurring patterns (customer, frequency, typical order day)
      - Estimate the likelihood of these recurring orders continuing in the forecast period
      
      Provide your response in JSON format with these fields for each product: product_id, name, 
      forecasted_months (array of month objects with quantity and revenue), growth_trend, seasonal_factors,
      recurring_order_patterns (array of recurring customer patterns if any).`
    };

    const aiResponse = await requestOpenAI(prompt, { 
      products: products,
      forecast_period: period === '3_months' ? 3 : 6
    });

    //OpenAI ile Tahmin Alınır.
    
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
    
    //AI’nin cevabı ai_interactions tablosuna kaydedilir.

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

      //Eğer useCache=true ise, daha önce oluşturulmuş en güncel yapay zeka çıktısı veritabanından çekilir ve API yanıtı olarak döndürülür.
      //Bu, her seferinde OpenAI API'yi çağırmaktan tasarruf sağlar.

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
     
    //Hangi kategorilerin en çok satış yaptığını tespit etmek.
    
    const recentSalesResult = await query(recentSalesSql);
    
    
    const lowStockSql = `
      SELECT COUNT(*) as count
      FROM products
      WHERE stock_quantity < 10 and is_active = true
    `;
    
    //Kritik stok seviyesini görmek.

    const lowStockResult = await query(lowStockSql);
    
    
    const popularProductsSql = `
      SELECT 
        p.id, p.name, p.category_id, c.name as category_name,
        SUM(oi.quantity) as quantity_sold
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at > NOW() - INTERVAL '30 days' and p.is_active = true
      GROUP BY p.id, p.name, p.category_id, c.name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `;

    //Popüler ürünleri analiz etmek.
    
    const popularProductsResult = await query(popularProductsSql);
    
    
    const businessData = {
      recent_sales_by_category: recentSalesResult.rows,
      low_stock_count: parseInt(lowStockResult.rows[0].count),
      popular_products: popularProductsResult.rows
    };
    
    //Yapay zekaya gönderilecek işletme özet verisi oluşturulur.
    
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

    //Sipariş verisini çek.
    
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
      
      Consider seasonal factors:
      - Current season: ${getSeason(new Date())}
      - Is holiday season: ${isHolidaySeason(new Date())}
      - Current month: ${new Date().toLocaleString('default', { month: 'long' })}
      
      For each product that needs restocking, provide:
      1. Recommended restock quantity
      2. Priority level (urgent, high, medium, low)
      3. Reasoning for recommendation including seasonal factors
      4. Whether the minimum stock level should be adjusted due to seasonal patterns

      Provide your response in JSON format with an array of 
      restock_recommendations containing: product_id, name, current_stock, effective_stock, pending_orders, 
      recommended_quantity, update_min_stock, minimum_stock_level, priority, reasoning.`
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
      WHERE p.is_active = true
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `;

    //Veritabanından stok verilerini çek.
    
    const inventoryResult = await query(inventorySql);
    
    
    const enhancedInventory = inventoryResult.rows.map(product => {
      const effectiveStock = parseInt(product.stock_quantity) + parseInt(product.pending_order_quantity || 0);
      
      return {
        ...product,
        effective_stock: effectiveStock,
        pending_orders: parseInt(product.pending_order_quantity || 0)
      };
    });
    
    //Her ürün için etkili stok hesaplanır. Mevcut stok + Bekleyen sipariş.
    
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

    //AI'nın kritik gördüğü ürünler için otomatik olarak supplier_orders ve supplier_order_items tablolarına sipariş açılır.
    
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

    //Gelen Veriyi İşleme.
    
    console.log(`[INFO] Found ${itemsToProcess.length} items to evaluate for restocking`);
    
    
    let urgentItems = itemsToProcess.filter(item => 
      (item.priority === 'urgent' || item.priority === 'high') &&
      (item.product_id || item.id) 
    );
    
    //Öncelik Filtrelemesi.
    
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
    
    //Ürünleri Normalize Etme.
    
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
    
  //AI’nin önerdiği ürünlerin hangi tedarikçiye ait olduğunu çeker.

    const supplierResult = await query(supplierSql, [productIds]);
    console.log(`[INFO] Found supplier information for ${supplierResult.rows.length} products`);
    
    
    const productsWithoutSupplier = productIds.filter(id => 
      !supplierResult.rows.some(row => row.product_id == id)
    );
    
    if (productsWithoutSupplier.length > 0) {
      console.log(`[INFO] ${productsWithoutSupplier.length} products don't have a supplier assigned and will be skipped:`, productsWithoutSupplier);
    }
    
    
    const supplierGroups = {}; //Ürünleri tedarikçiye göre gruplayarak supplierGroups nesnesine atar.
    
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
  const day = date.getDate();
  const northernHemisphere = true; 
  
  if (northernHemisphere) {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  } else {
    
    if (month >= 3 && month <= 5) return 'Fall';
    if (month >= 6 && month <= 8) return 'Winter';
    if (month >= 9 && month <= 11) return 'Spring';
    return 'Summer';
  }
}


function isHolidaySeason(date) {
  const month = date.getMonth() + 1; 
  const day = date.getDate();
  
  
  
  if (month === 11 || month === 12 || (month === 1 && day <= 15)) return true;
  
  
  if ((month === 4 && day >= 15) || (month === 5 && day <= 15)) return true;
  
  
  if (month === 7 || month === 8) return true;
  
  return false;
}

/**
 * Helper function to make OpenAI API calls
 */
async function requestOpenAI(systemPrompt, data) {
  try {
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
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.');
    }
    
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
    throw err;
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
 * NOTE: We're removing this function as requested
 */
function createMockResponse(promptContent, data) {
  throw new Error('Mock responses have been disabled. Please configure a valid OpenAI API key.');
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

    //Eğer predictionId verilmişse, bu ID'ye ait orijinal AI çıktısını veritabanından çeker.


    const results = {
      updated_products: [],
      created_orders: [],
      errors: []
    };
    
   //Tahminler üzerinde yapılan işlemleri ayrı ayrı loglamak ve UI'a dönmek için sonuç nesnesi hazırlanır.
    
    for (const prediction of predictions) {
      try {
        const { 
          product_id, 
          minimum_stock_level, 
          recommended_order_quantity,
          priority 
        } = prediction;

        //Her tahmin için sırayla işlemler yapılır.
        
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
        
        //Eğer minimum stok seviyesi belirlenmişse, ürün tablosunda bu alan güncellenir.
        //Güncellenen ürün, updated_products listesine eklenir.

        if (recommended_order_quantity && recommended_order_quantity > 0 && 
            (priority === 'high' || priority === 'urgent')) {
          
          
          const productSql = `
            SELECT p.id, p.name, p.price, p.supplier_id, s.name as supplier_name
            FROM products p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1 and p.is_active = true
          `;
          
        //Ürün ve bağlı tedarikçiyi getirir.

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

          //Tedarikçiye pending (beklemede) durumunda yeni bir sipariş oluşturur.

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

          //Yeni oluşturulan siparişe, ürün ve miktarı sipariş kalemi olarak eklenir.
          
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