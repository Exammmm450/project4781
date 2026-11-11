/**
 * Centralized API Error & Global Error Middleware
 */

class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad Request', details = null) {
    return new ApiError(400, msg, details);
  }

  static unauthorized(msg = 'Unauthorized access', details = null) {
    return new ApiError(401, msg, details);
  }

  static forbidden(msg = 'Forbidden: insufficient privileges', details = null) {
    return new ApiError(403, msg, details);
  }

  static notFound(msg = 'Resource not found', details = null) {
    return new ApiError(404, msg, details);
  }

  static conflict(msg = 'Resource conflict', details = null) {
    return new ApiError(409, msg, details);
  }

  static unprocessable(msg = 'Unprocessable entity', details = null) {
    return new ApiError(422, msg, details);
  }

  static internal(msg = 'Internal server error', details = null) {
    return new ApiError(500, msg, details);
  }
}

/**
 * 404 Handler
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: [${req.method}] ${req.originalUrl}`));
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for field '${field}'. Must be unique.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error occurred';
    details = Object.values(err.errors || {}).map((e) => e.message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Attached file exceeds maximum allowable size (10MB)';
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
};

