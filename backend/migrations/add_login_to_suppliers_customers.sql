-- Step 1: Add user authentication fields to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Step 2: Add user authentication fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Step 3: Create new roles for suppliers and customers if they don't exist already
INSERT INTO roles (code, name, description) 
VALUES 
  ('SUPPLIER', 'Supplier', 'Supplier role with limited access to manage their own orders'),
  ('CUSTOMER', 'Customer', 'Customer role with limited access to view their own orders')
ON CONFLICT (code) DO NOTHING;

-- Step 4: Add new permissions for supplier and customer specific actions
INSERT INTO permissions (code, description) 
VALUES 
  ('VIEW_OWN_ORDERS', 'View only orders associated with the user'),
  ('MANAGE_OWN_ORDERS', 'Manage only orders associated with the user'),
  ('VIEW_OWN_SUPPLIER_ORDERS', 'View only supplier orders associated with the supplier'),
  ('MANAGE_OWN_SUPPLIER_ORDERS', 'Manage only supplier orders associated with the supplier')
ON CONFLICT (code) DO NOTHING;

-- Step 5: Assign permissions to the supplier role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SUPPLIER' AND p.code IN ('VIEW_OWN_SUPPLIER_ORDERS', 'MANAGE_OWN_SUPPLIER_ORDERS')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 6: Assign permissions to the customer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CUSTOMER' AND p.code IN ('VIEW_OWN_ORDERS', 'MANAGE_OWN_ORDERS')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 7: Update all existing suppliers with the supplier role ID
UPDATE suppliers SET role_id = (SELECT id FROM roles WHERE code = 'SUPPLIER');

-- Step 8: Update all existing customers with the customer role ID
UPDATE customers SET role_id = (SELECT id FROM roles WHERE code = 'CUSTOMER');

-- Step 9: Add foreign key constraints
ALTER TABLE suppliers 
ADD CONSTRAINT fk_suppliers_role 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE customers 
ADD CONSTRAINT fk_customers_role 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- Step 10: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email); 