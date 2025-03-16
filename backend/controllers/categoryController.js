const { query } = require('../config/db');

/**
 * Get all categories with optional filtering
 */
exports.getCategories = async (req, res) => {
  try {
    const { 
      parent_id,
      is_active,
      search,
      include_product_count = false,
      sort_by = 'name',
      sort_dir = 'ASC'
    } = req.query;

    
    let sql = `
      SELECT c.*, p.name as parent_name 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE 1=1
    `;

    const params = [];
    
    
    if (parent_id) {
      if (parent_id === 'null') {
        sql += ` AND c.parent_id IS NULL`;
      } else {
        sql += ` AND c.parent_id = $${params.length + 1}`;
        params.push(parent_id);
      }
    }
    
    if (is_active !== undefined) {
      sql += ` AND c.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }
    
    if (search) {
      sql += ` AND (c.name ILIKE $${params.length + 1} OR c.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    
    sql += ` ORDER BY ${sort_by} ${sort_dir}`;
    
    
    const result = await query(sql, params);
    
    
    if (include_product_count === 'true') {
      const countPromises = result.rows.map(async (category) => {
        const countResult = await query(
          'SELECT COUNT(*) FROM products WHERE category_id = $1',
          [category.id]
        );
        category.product_count = parseInt(countResult.rows[0].count);
        return category;
      });
      
      const categoriesWithCount = await Promise.all(countPromises);
      return res.json(categoriesWithCount);
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories', error: err.message });
  }
};

/**
 * Get a category with subcategories and product counts
 */
exports.getCategoryWithSubcategories = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    const categoryResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = categoryResult.rows[0];
    
    
    const subcategoriesResult = await query(
      'SELECT * FROM categories WHERE parent_id = $1 ORDER BY name',
      [id]
    );
    
    category.subcategories = subcategoriesResult.rows;
    
    
    const mainCategoryCountResult = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [id]
    );
    
    category.product_count = parseInt(mainCategoryCountResult.rows[0].count);
    
    
    const subcategoryCountPromises = category.subcategories.map(async (subcat) => {
      const countResult = await query(
        'SELECT COUNT(*) FROM products WHERE category_id = $1',
        [subcat.id]
      );
      subcat.product_count = parseInt(countResult.rows[0].count);
      return subcat;
    });
    
    await Promise.all(subcategoryCountPromises);
    
    res.json(category);
  } catch (err) {
    console.error('Error fetching category with subcategories:', err);
    res.status(500).json({ message: 'Error fetching category details', error: err.message });
  }
};

/**
 * Get a single category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT c.*, p.name as parent_name 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1
    `;
    
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ message: 'Error fetching category', error: err.message });
  }
};

/**
 * Create a new category
 */
exports.createCategory = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      parent_id, 
      image_url,
      is_active = true 
    } = req.body;
    
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    
    if (parent_id) {
      const parentResult = await query('SELECT * FROM categories WHERE id = $1', [parent_id]);
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
    }
    
    
    const checkResult = await query('SELECT * FROM categories WHERE name = $1', [name]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: 'A category with this name already exists' });
    }
    
    const sql = `
      INSERT INTO categories (name, description, parent_id, image_url, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [name, description, parent_id || null, image_url, is_active];
    
    const result = await query(sql, values);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category', error: err.message });
  }
};

/**
 * Update a category
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      parent_id, 
      image_url,
      is_active 
    } = req.body;
    
    
    const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    
    if (parent_id && parseInt(parent_id) === parseInt(id)) {
      return res.status(400).json({ message: 'A category cannot be its own parent' });
    }
    
    
    if (parent_id) {
      const parentResult = await query('SELECT * FROM categories WHERE id = $1', [parent_id]);
      
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ message: 'Parent category not found' });
      }
      
      
      const isCircular = await checkCircularReference(parent_id, id);
      if (isCircular) {
        return res.status(400).json({ message: 'Circular category reference detected' });
      }
    }
    
    
    if (name) {
      const nameCheckResult = await query(
        'SELECT * FROM categories WHERE name = $1 AND id != $2',
        [name, id]
      );
      
      if (nameCheckResult.rows.length > 0) {
        return res.status(400).json({ message: 'A category with this name already exists' });
      }
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (parent_id !== undefined) {
      if (parent_id === null) {
        updates.push(`parent_id = NULL`);
      } else {
        updates.push(`parent_id = $${paramCount++}`);
        values.push(parent_id);
      }
    }
    
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const sql = `
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await query(sql, values);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category', error: err.message });
  }
};

/**
 * Delete a category
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    
    const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    
    const subcategoriesResult = await query(
      'SELECT COUNT(*) FROM categories WHERE parent_id = $1',
      [id]
    );
    
    if (parseInt(subcategoriesResult.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Cannot delete category with subcategories' });
    }
    
    
    const productsResult = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(productsResult.rows[0].count) > 0) {
      
      return res.status(400).json({ message: 'Cannot delete category with products' });
      
      
      
      
    }
    
    
    await query('DELETE FROM categories WHERE id = $1', [id]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category', error: err.message });
  }
};

/**
 * Helper function to check for circular category references
 */
async function checkCircularReference(parentId, childId) {
  try {
    
    let currentId = parentId;
    const visited = new Set();
    
    while (currentId) {
      if (visited.has(currentId)) {
        
        return true;
      }
      
      visited.add(currentId);
      
      if (parseInt(currentId) === parseInt(childId)) {
        return true;
      }
      
      const result = await query('SELECT parent_id FROM categories WHERE id = $1', [currentId]);
      
      if (result.rows.length === 0 || result.rows[0].parent_id === null) {
        break;
      }
      
      currentId = result.rows[0].parent_id;
    }
    
    return false;
  } catch (err) {
    console.error('Error checking circular reference:', err);
    throw err;
  }
}

/**
 * Get products in a category
 */
exports.getCategoryProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      include_subcategories = false,
      is_active,
      search,
      sort_by = 'name',
      sort_dir = 'ASC',
      limit = 50,
      offset = 0 
    } = req.query;
    
    
    const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE
    `;
    
    const params = [];
    
    if (include_subcategories === 'true') {
      
      const subcategoriesResult = await query(
        'WITH RECURSIVE subcategories AS (SELECT id FROM categories WHERE id = $1 UNION ALL SELECT c.id FROM categories c INNER JOIN subcategories sc ON c.parent_id = sc.id) SELECT id FROM subcategories',
        [id]
      );
      
      const categoryIds = subcategoriesResult.rows.map(row => row.id);
      sql += ` p.category_id = ANY($${params.length + 1})`;
      params.push(categoryIds);
    } else {
      sql += ` p.category_id = $${params.length + 1}`;
      params.push(id);
    }
    
    if (is_active !== undefined) {
      sql += ` AND p.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }
    
    if (search) {
      sql += ` AND (p.name ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    
    const countSql = sql.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);
    
    
    sql += ` ORDER BY ${sort_by} ${sort_dir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
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
    console.error('Error fetching category products:', err);
    res.status(500).json({ message: 'Error fetching category products', error: err.message });
  }
}; 