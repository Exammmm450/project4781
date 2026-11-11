/**
 * Standardized API Response Utilities
 */

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const paginated = (res, items = [], pagination = {}, message = 'Data retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total: pagination.total || items.length,
      page: pagination.page || 1,
      limit: pagination.limit || items.length,
      totalPages: pagination.totalPages || 1,
      hasNextPage: pagination.hasNextPage || false,
      hasPrevPage: pagination.hasPrevPage || false,
    },
    timestamp: new Date().toISOString(),
  });
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  success,
  paginated,
  error,
};

