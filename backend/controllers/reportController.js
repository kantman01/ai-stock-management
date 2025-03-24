const { query } = require('../config/db');

/**
 * Get all reports with filters
 */
exports.getReports = async (req, res) => {
  try {
    const {
      type,
      start_date,
      end_date,
      created_by,
      sort_by = 'created_at',
      sort_dir = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT r.*
      FROM reports r
      WHERE 1=1
    `;

    const params = [];

    if (type) {
      sql += ` AND r.type = $${params.length + 1}`;
      params.push(type);
    }

    if (start_date) {
      sql += ` AND r.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND r.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (created_by) {
      sql += ` AND r.created_by = $${params.length + 1}`;
      params.push(created_by);
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
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: 'Error fetching reports', error: err.message });
  }
};

/**
 * Get a report by ID
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const reportSql = `
      SELECT r.*
      FROM reports r
      WHERE r.id = $1
    `;

    const reportResult = await query(reportSql, [id]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const report = reportResult.rows[0];

    let reportData = null;

    switch (report.type) {
      case 'sales':
        reportData = await getSalesReportData(report);
        break;
      case 'inventory':
        reportData = await getInventoryReportData(report);
        break;
      case 'category':
        reportData = await getCategoryReportData(report);
        break;
      case 'customer':
        reportData = await getCustomerReportData(report);
        break;
      case 'supplier':
        reportData = await getSupplierReportData(report);
        break;
      default:
        reportData = { message: 'Unknown report type' };
    }

    report.data = reportData;

    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ message: 'Error fetching report', error: err.message });
  }
};

/**
 * Create a new report
 */
exports.createReport = async (req, res) => {
  try {
    const {
      name,
      type,
      parameters,
      format = 'pdf'
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Report name and type are required' });
    }

    const sql = `
      INSERT INTO reports (name, type, parameters, format, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(sql, [
      name,
      type,
      JSON.stringify(parameters || {}),
      format,
      req.user?.id || null
    ]);

    const report = result.rows[0];
    let reportData = null;

    switch (type) {
      case 'sales':
        reportData = await getSalesReportData(report);
        break;
      case 'inventory':
        reportData = await getInventoryReportData(report);
        break;
      case 'category':
        reportData = await getCategoryReportData(report);
        break;
      case 'customer':
        reportData = await getCustomerReportData(report);
        break;
      case 'supplier':
        reportData = await getSupplierReportData(report);
        break;
      default:
        reportData = { message: 'Unknown report type' };
    }

    report.data = reportData;

    res.status(201).json(report);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ message: 'Error creating report', error: err.message });
  }
};

/**
 * Delete a report
 */
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await query('SELECT * FROM reports WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await query('DELETE FROM reports WHERE id = $1', [id]);

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ message: 'Error deleting report', error: err.message });
  }
};


async function getSalesReportData(report) {
  const parameters = typeof report.parameters === 'string'
    ? JSON.parse(report.parameters)
    : report.parameters || {};

  const { start_date, end_date } = parameters;

  let query_params = [];
  let where_clause = '';

  if (start_date) {
    where_clause += ' AND o.created_at >= $1';
    query_params.push(start_date);
  }

  if (end_date) {
    where_clause += ` AND o.created_at <= $${query_params.length + 1}`;
    query_params.push(end_date);
  }

  const salesQuery = `
    SELECT 
      TO_CHAR(o.created_at, 'YYYY-MM') as month,
      SUM(o.total_amount) as total_sales,
      COUNT(o.id) as order_count
    FROM orders o
    WHERE o.status = 'completed' ${where_clause}
    GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
    ORDER BY month
  `;

  const productSalesQuery = `
    SELECT 
      p.name as product_name,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.total_price) as total_sales
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'completed' ${where_clause}
    GROUP BY p.id, p.name
    ORDER BY total_sales DESC
    LIMIT 10
  `;

  try {
    const salesResult = await query(salesQuery, query_params);
    const productSalesResult = await query(productSalesQuery, query_params);

    return {
      salesByMonth: {
        labels: salesResult.rows.map(row => row.month),
        values: salesResult.rows.map(row => parseFloat(row.total_sales))
      },
      topProducts: productSalesResult.rows,
      summary: {
        totalSales: salesResult.rows.reduce((sum, row) => sum + parseFloat(row.total_sales), 0),
        totalOrders: salesResult.rows.reduce((sum, row) => sum + parseInt(row.order_count), 0)
      }
    };
  } catch (err) {
    console.error('Error in sales report:', err);
    return {
      salesByMonth: { labels: [], values: [] },
      topProducts: [],
      summary: { totalSales: 0, totalOrders: 0 },
      error: err.message
    };
  }
}

async function getInventoryReportData(report) {
  const inventoryQuery = `
    SELECT 
      c.name as category_name,
      COUNT(p.id) as product_count,
      SUM(p.stock_quantity) as total_stock,
      AVG(p.price) as average_price
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY total_stock DESC
  `;

  const lowStockQuery = `
    SELECT 
      p.id, p.name, p.stock_quantity, p.price, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock_quantity <= 10
    ORDER BY p.stock_quantity ASC
    LIMIT 20
  `;

  try {
    const inventoryResult = await query(inventoryQuery);
    const lowStockResult = await query(lowStockQuery);

    return {
      stockByCategory: {
        labels: inventoryResult.rows.map(row => row.category_name || 'Uncategorized'),
        values: inventoryResult.rows.map(row => parseInt(row.total_stock))
      },
      lowStockProducts: lowStockResult.rows,
      summary: {
        totalProducts: inventoryResult.rows.reduce((sum, row) => sum + parseInt(row.product_count), 0),
        totalStock: inventoryResult.rows.reduce((sum, row) => sum + parseInt(row.total_stock), 0),
        lowStockCount: lowStockResult.rows.length
      }
    };
  } catch (err) {
    console.error('Error in inventory report:', err);
    return {
      stockByCategory: { labels: [], values: [] },
      lowStockProducts: [],
      summary: { totalProducts: 0, totalStock: 0, lowStockCount: 0 },
      error: err.message
    };
  }
}

async function getCategoryReportData(report) {
  const categoryQuery = `
    SELECT 
      c.name as category_name,
      COUNT(p.id) as product_count,
      SUM(p.stock_quantity) as total_stock,
      SUM(p.price * p.stock_quantity) as inventory_value
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id, c.name
    ORDER BY inventory_value DESC
  `;

  try {
    const categoryResult = await query(categoryQuery);

    return {
      categoryAnalysis: {
        labels: categoryResult.rows.map(row => row.category_name),
        values: categoryResult.rows.map(row => parseFloat(row.inventory_value))
      },
      categoryDetails: categoryResult.rows,
      summary: {
        totalCategories: categoryResult.rows.length,
        totalInventoryValue: categoryResult.rows.reduce((sum, row) => sum + parseFloat(row.inventory_value), 0)
      }
    };
  } catch (err) {
    console.error('Error in category report:', err);
    return {
      categoryAnalysis: { labels: [], values: [] },
      categoryDetails: [],
      summary: { totalCategories: 0, totalInventoryValue: 0 },
      error: err.message
    };
  }
}

async function getCustomerReportData(report) {
  const parameters = typeof report.parameters === 'string'
    ? JSON.parse(report.parameters)
    : report.parameters || {};

  const { start_date, end_date } = parameters;

  let query_params = [];
  let where_clause = '';

  if (start_date) {
    where_clause += ' AND o.created_at >= $1';
    query_params.push(start_date);
  }

  if (end_date) {
    where_clause += ` AND o.created_at <= $${query_params.length + 1}`;
    query_params.push(end_date);
  }

  const topCustomersQuery = `
    SELECT 
      c.id, CONCAT(c.first_name, ' ', c.last_name) as name, c.email,
      COUNT(o.id) as order_count,
      SUM(o.total_amount) as total_spent
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    WHERE o.status = 'completed' ${where_clause}
    GROUP BY c.id, c.first_name, c.last_name, c.email
    ORDER BY total_spent DESC
    LIMIT 10
  `;

  try {
    const customerResult = await query(topCustomersQuery, query_params);

    return {
      topCustomers: customerResult.rows,
      summary: {
        totalCustomersCount: customerResult.rows.length,
        totalRevenue: customerResult.rows.reduce((sum, row) => sum + parseFloat(row.total_spent), 0)
      }
    };
  } catch (err) {
    console.error('Error in customer report:', err);
    return {
      topCustomers: [],
      summary: {
        totalCustomersCount: 0,
        totalRevenue: 0
      },
      error: err.message
    };
  }
}

async function getSupplierReportData(report) {
  const parameters = typeof report.parameters === 'string'
    ? JSON.parse(report.parameters)
    : report.parameters || {};

  const { start_date, end_date } = parameters;

  let query_params = [];
  let where_clause = '';

  if (start_date) {
    where_clause += ' AND so.created_at >= $1';
    query_params.push(start_date);
  }

  if (end_date) {
    where_clause += ` AND so.created_at <= $${query_params.length + 1}`;
    query_params.push(end_date);
  }

  try {

    const tableCheckSql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'supplier_orders'
      ) as table_exists;
    `;

    const tableCheck = await query(tableCheckSql);
    console.log('Supplier orders table check:', tableCheck.rows[0]);

    if (!tableCheck.rows[0].table_exists) {
      console.error('The supplier_orders table does not exist');
      return {
        topSuppliers: [],
        summary: { totalSuppliersCount: 0, totalSpent: 0 },
        error: 'The supplier_orders table is not available in the database'
      };
    }

    const suppliersListSql = `
      SELECT id, name, email FROM suppliers LIMIT 10
    `;

    const suppliersList = await query(suppliersListSql);
    console.log(`Found ${suppliersList.rows.length} suppliers`);

    const suppliersQuery = `
      SELECT 
        s.id, s.name, s.email,
        COUNT(so.id) as order_count,
        SUM(so.total_amount) as total_spent
      FROM suppliers s
      LEFT JOIN supplier_orders so ON s.id = so.supplier_id
      WHERE (so.id IS NULL OR so.status = 'completed') ${where_clause}
      GROUP BY s.id, s.name, s.email
      ORDER BY total_spent DESC NULLS LAST
      LIMIT 10
    `;

    console.log('Supplier report query:', suppliersQuery);
    console.log('Parameters:', query_params);

    const supplierResult = await query(suppliersQuery, query_params);
    console.log(`Supplier report query returned ${supplierResult.rows.length} rows`);

    if (supplierResult.rows.length === 0) {
      console.log('No supplier orders found, returning basic supplier list');
      return {
        topSuppliers: suppliersList.rows.map(s => ({
          ...s,
          order_count: 0,
          total_spent: 0
        })),
        summary: {
          totalSuppliersCount: suppliersList.rows.length,
          totalSpent: 0
        }
      };
    }

    return {
      topSuppliers: supplierResult.rows,
      summary: {
        totalSuppliersCount: supplierResult.rows.length,
        totalSpent: supplierResult.rows.reduce((sum, row) => sum + parseFloat(row.total_spent || 0), 0)
      }
    };
  } catch (err) {
    console.error('Error in supplier report:', err);
    return {
      topSuppliers: [],
      summary: { totalSuppliersCount: 0, totalSpent: 0 },
      error: err.message
    };
  }
} 