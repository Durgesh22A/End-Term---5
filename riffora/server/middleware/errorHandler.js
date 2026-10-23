/**
 * Central error handler — always the LAST middleware in Express.
 * Any next(error) call lands here.
 *
 * WHY centralize errors?
 *   - Consistent JSON shape across the whole API
 *   - Single place to add logging (e.g., Sentry) later
 *   - No error handling scattered through every controller
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose: bad ObjectId (e.g., /api/playlists/not-an-id)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found`;
  }

  // Mongoose: duplicate unique field (e.g., email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`;
  }

  // Mongoose: schema validation failed
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.retryAfter && { retryAfter: String(err.retryAfter) }),
    // Stack trace only in development — never expose internals in prod
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
