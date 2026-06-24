import logger from '../config/logger.js';

// ─── 404 handler (must be registered after all routes) ──────────────────────
export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error:   `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// ─── Central error handler ───────────────────────────────────────────────────
// Express recognises error middleware by its 4-parameter signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;

  logger.error('Unhandled error', {
    message:    err.message,
    stack:      process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    method:     req.method,
    path:       req.path,
    statusCode,
  });

  // PostgreSQL constraint violations
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error:   'Duplicate entry — a record with this value already exists.',
    });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error:   'Foreign key constraint failed — referenced record does not exist.',
    });
  }

  return res.status(statusCode).json({
    success: false,
    error:   statusCode < 500 ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

