/**
 * Middleware to check if a user has the required permission
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ message: 'Access denied. No permissions.' });
    }

    
    const hasPermission = req.user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({ message: `Access denied. Missing permission: ${requiredPermission}` });
    }

    
    next();
  };
};

module.exports = {
  checkPermission
}; 