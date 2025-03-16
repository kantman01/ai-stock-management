const jwt = require('jsonwebtoken');
const db = require('../config/db');


const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Erişim yetkisi reddedildi. Token bulunamadı.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    const user = await getUserWithRole(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı.' });
    }
    
    
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};


const getUserWithRole = async (userId) => {
  try {
    const query = `
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
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const userData = result.rows[0];
    
    
    const permissionsQuery = `
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `;
    
    const permissionsResult = await db.query(permissionsQuery, [userData.role_id]);
    
    
    const user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      isActive: userData.is_active,
      position: userData.position,
      department: userData.department,
      role: {
        id: userData.role_id,
        code: userData.role_code,
        name: userData.role_name
      },
      permissions: permissionsResult.rows.map(row => row.code)
    };
    
    return user;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};


const checkPermission = (permission) => {
  return (req, res, next) => {
    
    authenticateJWT(req, res, () => {
      
      if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({ 
          message: 'Bu işlemi gerçekleştirmek için yetkiniz yok.' 
        });
      }
      
      
      next();
    });
  };
};

module.exports = {
  authenticateJWT,
  checkPermission
}; 