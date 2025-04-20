-- Add reliability_score and delivery_speed columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,1) DEFAULT 5.0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_speed DECIMAL(3,1) DEFAULT 5.0;

-- Add index for better performance when sorting
CREATE INDEX IF NOT EXISTS idx_suppliers_reliability_score ON suppliers(reliability_score);
CREATE INDEX IF NOT EXISTS idx_suppliers_delivery_speed ON suppliers(delivery_speed);

-- Add comments
COMMENT ON COLUMN suppliers.reliability_score IS 'Score from 0-10 indicating supplier reliability';
COMMENT ON COLUMN suppliers.delivery_speed IS 'Score from 0-10 indicating supplier delivery speed';

-- Update existing suppliers with random scores for testing (between 3 and 10)
UPDATE suppliers 
SET 
  reliability_score = 3 + (RANDOM() * 7),
  delivery_speed = 3 + (RANDOM() * 7); 