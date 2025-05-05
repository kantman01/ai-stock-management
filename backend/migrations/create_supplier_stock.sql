-- Create supplier_stock table to separate supplier inventory from admin inventory
CREATE TABLE IF NOT EXISTS supplier_stock (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, product_id)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_stock_supplier_id ON supplier_stock(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_stock_product_id ON supplier_stock(product_id);

-- Add comment
COMMENT ON TABLE supplier_stock IS 'Stores supplier-specific stock information separate from admin inventory'; 