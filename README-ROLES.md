# Role-Based Data Access in AI Stock Management

This document explains how the application handles role-based data access and filtering for different user roles.

## User Roles

The application has three primary user roles:

1. **Admin/Staff**: Full access to the system based on their permissions
2. **Supplier**: Access to their own products and orders
3. **Customer**: Access to their own orders and available products

## Authentication Flow

When a user logs in, the system:

1. Authenticates the user credentials
2. Determines the user's role (admin, staff, supplier, customer)
3. For suppliers and customers, retrieves their respective supplier_id or customer_id
4. Stores all this information in the Redux store's auth state
5. Uses this information for data filtering throughout the application

## Role-Based API Parameter Handling

The application uses a utility system to automatically add role-specific parameters to API requests:

### API Utilities (`/src/utils/apiUtils.js`)

This file contains utilities to handle role-based parameter modifications:

- `addRoleBasedParams()`: Generic utility to add role-specific parameters
- `productApiUtils.getListParams()`: For product-related requests
- `orderApiUtils.getListParams()`: For order-related requests
- `supplierOrderApiUtils.getListParams()`: For supplier order-related requests

### How It Works

1. The utility functions check the user's role from the Redux store
2. Based on the role, they add appropriate parameters:
   - For suppliers: adds `supplier_id`
   - For customers: adds `customer_id`
3. The component calls these utilities before making API requests
4. The backend filters data based on these parameters

## Example: Products Page

```javascript

const baseParams = {
  limit: rowsPerPage,
  offset: page * rowsPerPage,
  search: searchTerm || undefined,
  
};


const params = productApiUtils.getListParams(baseParams);


const response = await api.get('/products', { params });
```

## Example: Supplier Dashboard

For the supplier dashboard, we use the `supplierId` from the user object:

```javascript

const response = await apiServices.dashboard.getSupplierStats({
  supplier_id: user.supplierId
});
```

## Implementation Details

### Authentication Controller (`/backend/controllers/authController.js`)

When a user logs in, the controller:
1. Retrieves user information and role
2. For suppliers: queries the `suppliers` table to get the `supplier_id`
3. For customers: queries the `customers` table to get the `customer_id`
4. Includes these IDs in the user object returned to the frontend

### Redux Auth Slice (`/src/redux/features/authSlice.js`)

Stores the complete user object including:
- User details (id, email, name)
- Role information (id, code, permissions)
- Role-specific IDs (supplierId, customerId)

### Backend Filtering

Backend controllers use the provided parameters to filter data:
- Products controller filters by `supplier_id`
- Orders controller filters by `customer_id`
- Supplier orders controller filters by `supplier_id`

## Database Relationships

The filtering logic is based on these database relationships:

```sql
-- Suppliers are linked to users
select * from suppliers s
  left join users u on u.id = s.user_id;

-- Products are linked to suppliers
select * from products p
  left join suppliers s on p.supplier_id = s.id;
```

## Benefits

1. **Security**: Data is filtered at the database level
2. **Simplicity**: Components don't need complex logic for data filtering
3. **Consistency**: All API requests follow the same pattern
4. **Maintainability**: Easy to extend with new roles or filtering logic 