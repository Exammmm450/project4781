const { ApiError } = require('./error');

/**
 * Role-Based Access Control (RBAC) Guard
 * @param {string[]} allowedRoles 
 */
const roleGuard = (allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Clearance level insufficient: Access restricted to [${allowedRoles.join(', ')}] roles`
        )
      );
    }

    next();
  };
};

module.exports = roleGuard;

