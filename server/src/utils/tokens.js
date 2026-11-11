const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate Access Token (15 minutes)
 * @param {Object} user 
 * @returns {string}
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
};

/**
 * Generate Refresh Token (1 hour)
 * @param {Object} user 
 * @returns {string}
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenVersion: user.tokenVersion || 0,
    },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
};

/**
 * Verify Access Token
 * @param {string} token 
 * @returns {Object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

/**
 * Verify Refresh Token
 * @param {string} token 
 * @returns {Object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

/**
 * Cookie options for Refresh Token
 */
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: env.jwt.refreshMaxAgeMs, // 3600000 ms = 1 hour strictly
  path: '/',
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
};

