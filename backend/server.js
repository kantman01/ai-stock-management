require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const { pool } = require('./config/db');
const { initCronJobs } = require('./utils/cronJobs');
const apiRoutes = require('./routes/api');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const stockMovementRoutes = require('./routes/stockMovementRoutes');
const supplierOrderRoutes = require('./routes/supplierOrderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const barcodeRoutes = require('./routes/barcodeRoutes');

const { authenticateJWT } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, 
  createParentPath: true, 
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));


app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

//app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateJWT, userRoutes);
app.use('/api/products', authenticateJWT, productRoutes);
app.use('/api/categories', authenticateJWT, categoryRoutes);
app.use('/api/orders', authenticateJWT, orderRoutes);
app.use('/api/customers', authenticateJWT, customerRoutes);
app.use('/api/suppliers', authenticateJWT, supplierRoutes);
app.use('/api/stock-movements', authenticateJWT, stockMovementRoutes);
app.use('/api/supplier-orders', authenticateJWT, supplierOrderRoutes);
app.use('/api/reports', authenticateJWT, reportRoutes);
app.use('/api/ai', authenticateJWT, aiRoutes);
app.use('/api/admin', authenticateJWT, adminRoutes);
app.use('/api/dashboard', authenticateJWT, dashboardRoutes);
app.use('/api/notifications', authenticateJWT, notificationRoutes);
app.use('/api/barcode', authenticateJWT, barcodeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AI Stock Management API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Sunucu hatası', error: err.message });
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
    process.exit(1);
  } else {
    console.log('Database connected, current time:', res.rows[0].now);
    
    
    initCronJobs();
    
    app.listen(PORT, () => {
      console.log(`Server ${PORT} portunda çalışıyor`);
    });
  }
}); 