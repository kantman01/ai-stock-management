-- Add is_ai_created column to supplier_orders table
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS is_ai_created BOOLEAN DEFAULT FALSE;

-- Update existing AI-created orders if any (based on notes field)
UPDATE supplier_orders 
SET is_ai_created = TRUE 
WHERE notes LIKE '%Automatically created by AI system%' OR notes LIKE '%AI%';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_supplier_orders_is_ai_created ON supplier_orders(is_ai_created);

-- Update view or function if applicable
COMMENT ON COLUMN supplier_orders.is_ai_created IS 'Indicates if this order was automatically created by the AI system'; 