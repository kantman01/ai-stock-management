-- Sample data for AI Stock Management System (no hardcoded IDs)
-- This file inserts 5 records into each main table with realistic values and matching relationships.

-- ROLES
INSERT INTO roles (code, name, description) VALUES
  ('admin', 'Administrator', 'System administrator'),
  ('warehouse', 'Warehouse Manager', 'Manages warehouse operations'),
  ('supplier', 'Supplier', 'Supplier role'),
  ('customer', 'Customer', 'Customer role'),
  ('staff', 'Staff', 'General staff');

-- USERS
INSERT INTO users (email, password, first_name, last_name, phone, role_id, position, department, is_active)
VALUES
  ('admin@company.com', 'hashedpass1', 'Alice', 'Admin', '555-1001', (SELECT id FROM roles WHERE code='admin'), 'Admin', 'IT', true),
  ('warehouse@company.com', 'hashedpass2', 'Bob', 'Warehouse', '555-1002', (SELECT id FROM roles WHERE code='warehouse'), 'Manager', 'Warehouse', true),
  ('supplier1@sup.com', 'hashedpass3', 'Carol', 'Supplier', '555-1003', (SELECT id FROM roles WHERE code='supplier'), 'Owner', 'Sales', true),
  ('customer1@customer.com', 'hashedpass4', 'David', 'Customer', '555-1004', (SELECT id FROM roles WHERE code='customer'), 'Buyer', 'Retail', true),
  ('staff@company.com', 'hashedpass5', 'Eve', 'Staff', '555-1005', (SELECT id FROM roles WHERE code='staff'), 'Staff', 'Support', true);

-- SUPPLIERS
INSERT INTO suppliers (name, contact_name, email, phone, address, city, state, postal_code, country, tax_id, website, notes, payment_terms, is_active, user_id)
VALUES
  ('Global Foods', 'Carol Supplier', 'supplier1@sup.com', '555-2001', '123 Food St', 'Istanbul', 'Marmara', '34000', 'Turkey', 'TAX123', 'http://globalfoods.com', 'Main supplier', 'Net 30', true, (SELECT id FROM users WHERE email='supplier1@sup.com')),
  ('Fresh Produce', 'John Green', 'supplier2@sup.com', '555-2002', '456 Veg Ave', 'Ankara', 'Ankara', '06000', 'Turkey', 'TAX124', 'http://freshproduce.com', 'Vegetables', 'Net 15', true, NULL),
  ('Tech Supplies', 'Jane Tech', 'supplier3@sup.com', '555-2003', '789 Tech Rd', 'Izmir', 'Aegean', '35000', 'Turkey', 'TAX125', 'http://techsupplies.com', 'Electronics', 'Net 30', true, NULL),
  ('Beverage Co', 'Mike Drink', 'supplier4@sup.com', '555-2004', '321 Drink Blvd', 'Bursa', 'Marmara', '16000', 'Turkey', 'TAX126', 'http://beverageco.com', 'Beverages', 'Net 45', true, NULL),
  ('Paper Goods', 'Sara Paper', 'supplier5@sup.com', '555-2005', '654 Paper Ln', 'Antalya', 'Mediterranean', '07000', 'Turkey', 'TAX127', 'http://papergoods.com', 'Paper products', 'Net 30', true, NULL);

-- CUSTOMERS
INSERT INTO customers (first_name, last_name, email, phone, address, city, postal_code, country, company_name, notes, is_active, user_id)
VALUES
  ('David', 'Customer', 'customer1@customer.com', '555-3001', '1 Main St', 'Istanbul', '34000', 'Turkey', 'RetailMart', 'VIP customer', true, (SELECT id FROM users WHERE email='customer1@customer.com')),
  ('Emily', 'Shopper', 'customer2@customer.com', '555-3002', '2 Main St', 'Ankara', '06000', 'Turkey', 'ShopCo', '', true, NULL),
  ('Frank', 'Buyer', 'customer3@customer.com', '555-3003', '3 Main St', 'Izmir', '35000', 'Turkey', 'BuyMore', '', true, NULL),
  ('Grace', 'Retail', 'customer4@customer.com', '555-3004', '4 Main St', 'Bursa', '16000', 'Turkey', 'Retailers', '', true, NULL),
  ('Hank', 'Client', 'customer5@customer.com', '555-3005', '5 Main St', 'Antalya', '07000', 'Turkey', 'ClientCorp', '', true, NULL);

-- CATEGORIES
INSERT INTO categories (name, description, parent_id, is_active)
VALUES
  ('Beverages', 'Drinks and beverages', NULL, true),
  ('Snacks', 'Snack foods', NULL, true),
  ('Electronics', 'Electronic items', NULL, true),
  ('Paper', 'Paper products', NULL, true),
  ('Vegetables', 'Fresh vegetables', NULL, true);

-- PRODUCTS
INSERT INTO products (name, description, barcode, sku, category_id, supplier_id, price, cost_price, tax_rate, stock_quantity, min_stock_quantity, reorder_quantity, image_url, is_active, weight, dimensions)
VALUES
  ('Cola', 'Soft drink', '1234567890123', 'COLA-001', (SELECT id FROM categories WHERE name='Beverages'), (SELECT id FROM suppliers WHERE name='Beverage Co'), 1.50, 1.00, 8, 100, 10, 50, NULL, true, 0.5, '0.5L'),
  ('Potato Chips', 'Crispy chips', '1234567890124', 'SNACK-001', (SELECT id FROM categories WHERE name='Snacks'), (SELECT id FROM suppliers WHERE name='Fresh Produce'), 2.00, 1.20, 8, 200, 20, 100, NULL, true, 0.2, '200g'),
  ('Laptop', '15-inch laptop', '1234567890125', 'ELEC-001', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM suppliers WHERE name='Tech Supplies'), 1500.00, 1200.00, 18, 10, 2, 5, NULL, true, 2.5, '15in'),
  ('Printer Paper', 'A4 paper', '1234567890126', 'PAPER-001', (SELECT id FROM categories WHERE name='Paper'), (SELECT id FROM suppliers WHERE name='Paper Goods'), 5.00, 3.00, 18, 500, 50, 200, NULL, true, 2.0, 'A4'),
  ('Tomato', 'Fresh tomato', '1234567890127', 'VEG-001', (SELECT id FROM categories WHERE name='Vegetables'), (SELECT id FROM suppliers WHERE name='Global Foods'), 3.00, 2.00, 1, 300, 30, 100, NULL, true, 0.1, '1kg');

-- SUPPLIER STOCK
INSERT INTO supplier_stock (supplier_id, product_id, stock_quantity, min_stock_quantity)
VALUES
  ((SELECT id FROM suppliers WHERE name='Global Foods'), (SELECT id FROM products WHERE name='Tomato'), 120, 20),
  ((SELECT id FROM suppliers WHERE name='Fresh Produce'), (SELECT id FROM products WHERE name='Potato Chips'), 80, 10),
  ((SELECT id FROM suppliers WHERE name='Tech Supplies'), (SELECT id FROM products WHERE name='Laptop'), 5, 1),
  ((SELECT id FROM suppliers WHERE name='Beverage Co'), (SELECT id FROM products WHERE name='Cola'), 60, 5),
  ((SELECT id FROM suppliers WHERE name='Paper Goods'), (SELECT id FROM products WHERE name='Printer Paper'), 200, 30);

-- ORDERS
INSERT INTO orders (customer_id, order_number, status, total_amount, created_at)
VALUES
  ((SELECT id FROM customers WHERE email='customer1@customer.com'), 'ORD-1001', 'pending', 45.00, NOW() - INTERVAL '10 days'),
  ((SELECT id FROM customers WHERE email='customer2@customer.com'), 'ORD-1002', 'approved', 1500.00, NOW() - INTERVAL '8 days'),
  ((SELECT id FROM customers WHERE email='customer3@customer.com'), 'ORD-1003', 'shipped', 10.00, NOW() - INTERVAL '6 days'),
  ((SELECT id FROM customers WHERE email='customer4@customer.com'), 'ORD-1004', 'delivered', 25.00, NOW() - INTERVAL '4 days'),
  ((SELECT id FROM customers WHERE email='customer5@customer.com'), 'ORD-1005', 'completed', 100.00, NOW() - INTERVAL '2 days');

-- ORDER ITEMS
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
VALUES
  ((SELECT id FROM orders WHERE order_number='ORD-1001'), (SELECT id FROM products WHERE name='Cola'), 10, 1.50, 15.00),
  ((SELECT id FROM orders WHERE order_number='ORD-1001'), (SELECT id FROM products WHERE name='Potato Chips'), 5, 2.00, 10.00),
  ((SELECT id FROM orders WHERE order_number='ORD-1002'), (SELECT id FROM products WHERE name='Laptop'), 1, 1500.00, 1500.00),
  ((SELECT id FROM orders WHERE order_number='ORD-1003'), (SELECT id FROM products WHERE name='Printer Paper'), 2, 5.00, 10.00),
  ((SELECT id FROM orders WHERE order_number='ORD-1004'), (SELECT id FROM products WHERE name='Tomato'), 5, 3.00, 15.00);

-- SUPPLIER ORDERS
INSERT INTO supplier_orders (supplier_id, status, total_amount, notes, created_at)
VALUES
  ((SELECT id FROM suppliers WHERE name='Global Foods'), 'pending', 300.00, 'Restock tomatoes', NOW() - INTERVAL '9 days'),
  ((SELECT id FROM suppliers WHERE name='Fresh Produce'), 'approved', 160.00, 'Chips order', NOW() - INTERVAL '7 days'),
  ((SELECT id FROM suppliers WHERE name='Tech Supplies'), 'shipped', 1200.00, 'Laptop order', NOW() - INTERVAL '5 days'),
  ((SELECT id FROM suppliers WHERE name='Beverage Co'), 'delivered', 90.00, 'Cola order', NOW() - INTERVAL '3 days'),
  ((SELECT id FROM suppliers WHERE name='Paper Goods'), 'completed', 400.00, 'Paper order', NOW() - INTERVAL '1 days');

-- SUPPLIER ORDER ITEMS
INSERT INTO supplier_order_items (supplier_order_id, product_id, quantity, unit_price, total_price)
VALUES
  ((SELECT id FROM supplier_orders WHERE notes='Restock tomatoes'), (SELECT id FROM products WHERE name='Tomato'), 100, 3.00, 300.00),
  ((SELECT id FROM supplier_orders WHERE notes='Chips order'), (SELECT id FROM products WHERE name='Potato Chips'), 80, 2.00, 160.00),
  ((SELECT id FROM supplier_orders WHERE notes='Laptop order'), (SELECT id FROM products WHERE name='Laptop'), 1, 1200.00, 1200.00),
  ((SELECT id FROM supplier_orders WHERE notes='Cola order'), (SELECT id FROM products WHERE name='Cola'), 60, 1.50, 90.00),
  ((SELECT id FROM supplier_orders WHERE notes='Paper order'), (SELECT id FROM products WHERE name='Printer Paper'), 200, 2.00, 400.00);

-- STOCK MOVEMENTS
INSERT INTO stock_movements (product_id, type, quantity, previous_quantity, new_quantity, notes, created_by, created_at)
VALUES
  ((SELECT id FROM products WHERE name='Cola'), 'receipt', 60, 40, 100, 'Initial stock', (SELECT id FROM users WHERE email='admin@company.com'), NOW() - INTERVAL '10 days'),
  ((SELECT id FROM products WHERE name='Potato Chips'), 'receipt', 80, 120, 200, 'Restock', (SELECT id FROM users WHERE email='warehouse@company.com'), NOW() - INTERVAL '8 days'),
  ((SELECT id FROM products WHERE name='Laptop'), 'receipt', 5, 5, 10, 'Laptop delivery', (SELECT id FROM users WHERE email='supplier1@sup.com'), NOW() - INTERVAL '6 days'),
  ((SELECT id FROM products WHERE name='Printer Paper'), 'receipt', 200, 300, 500, 'Paper restock', (SELECT id FROM users WHERE email='staff@company.com'), NOW() - INTERVAL '4 days'),
  ((SELECT id FROM products WHERE name='Tomato'), 'receipt', 100, 200, 300, 'Tomato restock', (SELECT id FROM users WHERE email='admin@company.com'), NOW() - INTERVAL '2 days');

-- NOTIFICATIONS
INSERT INTO notifications (title, message, type, user_id, is_global, created_at)
VALUES
  ('Low Stock', 'Cola is low in stock', 'warning', (SELECT id FROM users WHERE email='admin@company.com'), false, NOW() - INTERVAL '9 days'),
  ('Order Approved', 'Order ORD-1002 has been approved', 'info', (SELECT id FROM users WHERE email='warehouse@company.com'), false, NOW() - INTERVAL '7 days'),
  ('Order Shipped', 'Order ORD-1003 has been shipped', 'info', (SELECT id FROM users WHERE email='supplier1@sup.com'), false, NOW() - INTERVAL '5 days'),
  ('Order Delivered', 'Order ORD-1004 has been delivered', 'success', (SELECT id FROM users WHERE email='customer1@customer.com'), false, NOW() - INTERVAL '3 days'),
  ('Order Completed', 'Order ORD-1005 has been completed', 'success', (SELECT id FROM users WHERE email='staff@company.com'), false, NOW() - INTERVAL '1 days'); 