-- Add preferred_supplier_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS preferred_supplier_id INTEGER;

-- Add foreign key constraint referencing suppliers table
ALTER TABLE products ADD CONSTRAINT fk_products_preferred_supplier 
    FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier_id ON products(preferred_supplier_id);

-- Add comment
COMMENT ON COLUMN products.preferred_supplier_id IS 'The preferred supplier ID for automatic ordering'; 