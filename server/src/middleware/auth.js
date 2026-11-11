const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const { ApiError } = require('./error');

/**
 * Authentication Middleware
 * Validates Bearer Access Token & Token Version
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Access denied: Bearer token is missing'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Access denied: Invalid token format'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Session expired: Access token has expired', { expired: true }));
      }
      return next(ApiError.unauthorized('Authentication failed: Invalid access token'));
    }

    // Retrieve active user from database
    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(ApiError.unauthorized('User account no longer exists'));
    }

    // Check account status
    if (user.status === 'suspended') {
      return next(ApiError.forbidden('Account has been suspended by Risk & Security Operations'));
    }

    // Check tokenVersion for single-click force logout / session revocation
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return next(ApiError.unauthorized('Session has been revoked by Security Admin. Please log in again.', { sessionRevoked: true }));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = auth;

