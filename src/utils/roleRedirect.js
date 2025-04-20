/**
 * Returns the appropriate redirect path based on the user's role
 * @param {Object} user - The user object from auth state
 * @returns {string} The path to redirect to
 */
export const getRedirectPathForUser = (user) => {
  if (!user) return '/login';

  const roleCode = user.role?.code?.toUpperCase();
  switch (roleCode) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/dashboard';
    case 'WAREHOUSE':
      return '/stock/movements';
    case 'SALES':
      return '/orders';
    case 'SUPPLIER':
      return '/dashboard';
    case 'CUSTOMER':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}; 