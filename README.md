# AI Stock Management System

> **Quick Setup**
>
> **Requirements:**
> - Node.js (v14 or higher)
> - npm (v6 or higher)
>
> **Setup Commands:**
> ```sh
> # Install frontend dependencies
> npm install
> # Start frontend server
> npm start
>
> # Install backend dependencies (In a different terminal)
> cd backend
> npm install
> # Start backend server
> npm run dev
> ```

A comprehensive stock management system with AI-powered insights, customer portal, and supplier integration.

## Features

### Customer Features

- **View and Manage Orders**: Customers can view their order history and manage their own orders
- **Track Order Status**: Real-time tracking of order status (pending, approved, shipped, delivered, cancelled)
- **Place New Orders**: Easy interface for placing new orders

### Supplier Integration Features

- **Supplier Orders**: Create and manage orders to restock inventory from suppliers
- **Order Status Workflow**: Complete supplier order lifecycle management
  - Pending → Approved → Shipped → Delivered → Completed
- **Inventory Integration**: Auto-update inventory when supplier orders are completed
- **Role-Based Access**: Different interfaces for suppliers and warehouse managers

### Stock Management

- **Product Management**: Add, edit, delete products with detailed information
- **Category Management**: Organize products with hierarchical categories
- **Stock Movements**: Track all stock movements with detailed history
- **Low Stock Alerts**: Get notified when products are running low

### Order Management

- **Customer Orders**: Process and fulfill customer orders
- **Supplier Orders**: Manage orders to suppliers for restocking
- **Order Status Tracking**: Track order status throughout the lifecycle

## Technical Architecture

### Frontend

- React with Material UI for a modern, responsive interface
- Redux for state management
- React Router for navigation

### Backend

- Node.js with Express
- PostgreSQL database
- RESTful API architecture

### Authentication & Security

- JWT-based authentication
- Role-based access control
- Permissions system for fine-grained access control

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Set up environment variables:
   - Create `.env` file in backend directory with database connection details
4. Run database migrations:
   ```
   cd backend && npm run migrate
   ```
5. Start the servers:

   ```
   # In one terminal
   cd frontend && npm run dev

   # In another terminal
   cd backend && npm run dev
   ```

## License

MIT
