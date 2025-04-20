# New Features: Supplier Order Management & Product Images

## 1. Enhanced Supplier Order Management

Suppliers can now manage their orders directly through the system with the following capabilities:

### Order Status Management

Suppliers can now:
- Approve pending orders
- Mark orders as shipped
- Mark orders as delivered

Each status change follows a specific workflow:
- Pending → Approved → Shipped → Delivered → Completed

Status transition rules:
- Only suppliers can approve, ship, and mark as delivered
- Only staff can complete orders (adding items to inventory)
- Invalid transitions are prevented with appropriate error messages

### Security and Permissions

- Suppliers can only update orders assigned to them
- Each supplier can only see and manage their own orders
- Status updates create notifications for staff and customers

## 2. Product Image Management

Products now support image uploads with the following features:

### Image Upload

- Supports JPEG, PNG, and GIF formats
- Images are validated for type and size (max 2MB)
- Images are stored in a dedicated uploads directory
- Each product can have one image

### Image Display

- Images are displayed in the product list as thumbnails
- Full-size images are shown in product details
- Fallback placeholders are displayed for products without images

### Technical Implementation

- Added a new API endpoint: `/api/products/upload-image`
- Images are stored in `backend/public/uploads`
- Image URLs are stored in the `image_url` field of the products table
- Express-fileupload middleware handles file uploads

## How to Use

### Supplier Order Management

1. Suppliers log in to their account
2. Navigate to "My Orders" in the sidebar
3. View pending orders in the list
4. Click on the appropriate action button to update order status:
   - Approve order (for pending orders)
   - Mark as shipped (for approved orders)
   - Mark as delivered (for shipped orders)

### Product Image Upload

1. Go to the Products management page
2. Click "Add Product" or "Edit" on an existing product
3. In the product form, you'll see an image upload section
4. Either:
   - Click "Upload Image" to select a file from your computer
   - Or enter a URL in the "Image URL" field
5. Save the product to store the image

## API Documentation

### Supplier Order Status Update

```
PUT /api/supplier-orders/:id/status
```

**Request Body:**
```json
{
  "status": "approved" | "shipped" | "delivered"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "approved",
  "supplier_id": 45,
  "total_amount": 123.45,
  "items": [
    
  ]
}
```

### Product Image Upload

```
POST /api/products/upload-image
```

**Request:**
- Form data with 'image' file

**Response:**
```json
{
  "message": "Image uploaded successfully",
  "imageUrl": "http://localhost:5000/uploads/product_1234567890.jpg"
}
``` 