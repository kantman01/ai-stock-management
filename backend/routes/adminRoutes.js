const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

/**
 * @route   POST /api/admin/migrations/run
 * @desc    Run all migrations in the migrations folder
 * @access  Private (Requires MANAGE_SETTINGS permission)
 */
router.post('/migrations/run', checkPermission(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    
    sqlFiles.sort();
    
    const results = [];
    
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      try {
        await query(sql);
        results.push({ file, success: true });
        console.log(`Migration succeeded: ${file}`);
      } catch (err) {
        results.push({ file, success: false, error: err.message });
        console.error(`Migration failed: ${file}`, err);
      }
    }
    
    res.json({ 
      message: 'Migrations completed', 
      results 
    });
  } catch (err) {
    console.error('Error running migrations:', err);
    res.status(500).json({ message: 'Error running migrations', error: err.message });
  }
});

module.exports = router; 