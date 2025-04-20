require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./backend/config/db');

async function runMigration() {
  try {
    console.log('Running database migration...');
    
    const migrationFile = path.join(__dirname, 'backend/migrations/add_is_ai_created_to_supplier_orders.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    await query(sql);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration(); 