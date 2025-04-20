const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    const userType = decoded.userType || 'staff';
    
    const user = await getUserWithRole(decoded.userId, userType);

    if (!user) {
      return res.status(401).json({ message: 'Invalid user.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const getUserWithRole = async (userId, userType = 'staff') => {
  try {
    let userData = null;
    let permissionsResult = null;
    
    switch (userType) {
      case 'staff':
        
        const staffQuery = `
          SELECT 
            u.id, 
            u.email, 
            u.first_name, 
            u.last_name, 
            u.phone,
            u.is_active,
            u.position,
            u.department,
            r.id as role_id, 
            r.code as role_code, 
            r.name as role_name
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE u.id = $1
        `;

        const staffResult = await db.query(staffQuery, [userId]);
        
        if (staffResult.rows.length === 0) {
          return null;
        }
        
        userData = staffResult.rows[0];
        
        
        const staffPermissionsQuery = `
          SELECT p.code
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1
        `;
        
        permissionsResult = await db.query(staffPermissionsQuery, [userData.role_id]);
        break;
        
      case 'supplier':
        
        const supplierQuery = `
          SELECT 
            s.id, 
            s.email, 
            s.contact_name as first_name,
            '' as last_name,
            s.phone,
            s.is_active,
            s.name as company_name,
            r.id as role_id, 
            r.code as role_code, 
            r.name as role_name
          FROM suppliers s
          JOIN roles r ON s.role_id = r.id
          WHERE s.id = $1
        `;

        const supplierResult = await db.query(supplierQuery, [userId]);
        
        if (supplierResult.rows.length === 0) {
          return null;
        }
        
        userData = supplierResult.rows[0];
        
        
        const supplierPermissionsQuery = `
          SELECT p.code
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1
        `;
        
        permissionsResult = await db.query(supplierPermissionsQuery, [userData.role_id]);
        break;
        
      case 'customer':
        
        const customerQuery = `
          SELECT 
            c.id, 
            c.email, 
            c.first_name,
            c.last_name,
            c.phone,
            c.is_active,
            r.id as role_id, 
            r.code as role_code, 
            r.name as role_name
          FROM customers c
          JOIN roles r ON c.role_id = r.id
          WHERE c.id = $1
        `;

        const customerResult = await db.query(customerQuery, [userId]);
        
        if (customerResult.rows.length === 0) {
          return null;
        }
        
        userData = customerResult.rows[0];
        
        
        const customerPermissionsQuery = `
          SELECT p.code
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1
        `;
        
        permissionsResult = await db.query(customerPermissionsQuery, [userData.role_id]);
        break;
        
      default:
        return null;
    }

    const user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      isActive: userData.is_active,
      position: userData.position,
      department: userData.department,
      companyName: userData.company_name,
      userType: userType,
      role: {
        id: userData.role_id,
        code: userData.role_code,
        name: userData.role_name,
        permissions: permissionsResult.rows.map(row => row.code)
      }
    };

    return user;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

/**
 * Middleware to check if a user has a specific permission
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    authenticateJWT(req, res, () => {
      
      if (req.user && req.user.role && req.user.role.code === 'ADMIN') {
        return next();
      }
      next();
    });
  };
};

/**
 * Middleware to check if the user is a supplier
 */
const checkSupplier = (req, res, next) => {
  if (req.user && req.user.role.code.toLowerCase() === 'supplier') {
    return next();
  }
  
  return res.status(403).json({
    message: 'Only suppliers can access this resource.'
  });
};

/**
 * Middleware to check if a supplier is accessing their own data
 */
const checkSupplierOwnership = (req, res, next) => {
  if (req.user && req.user.role.code.toLowerCase() === 'supplier') {
    
    const supplierId = req.user.id;
    
    
    const requestedSupplierId = parseInt(req.params.id);
    
    if (supplierId === requestedSupplierId) {
      return next();
    }
  }
  
  return res.status(403).json({
    message: 'You can only access your own supplier data.'
  });
};

/**
 * Middleware to check if the user is a customer
 */
const checkCustomer = (req, res, next) => {
  if (req.user && req.user.role.code.toLowerCase() === 'customer') {
    return next();
  }
  
  return res.status(403).json({
    message: 'Only customers can access this resource.'
  });
};

/**
 * Middleware to check if a customer is accessing their own data
 */
const checkCustomerOwnership = (req, res, next) => {
  if (req.user && req.user.role.code.toLowerCase() === 'customer') {
    
    const customerId = req.user.id;
    
    
    const requestedCustomerId = parseInt(req.params.id);
    
    if (customerId === requestedCustomerId) {
      return next();
    }
  }
  
  return res.status(403).json({
    message: 'You can only access your own customer data.'
  });
};

module.exports = {
  authenticateJWT,
  checkPermission,
  checkSupplier,
  checkSupplierOwnership,
  checkCustomer,
  checkCustomerOwnership
}; 