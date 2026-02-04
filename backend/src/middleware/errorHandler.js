/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors,
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Invalid token') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Unable to connect to mail server',
    });
  }

  if (err.code === 'EAUTH' || err.message?.includes('authentication')) {
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid email credentials',
    });
  }

  // IMAP-specific errors
  if (err.source === 'imap') {
    return res.status(502).json({
      error: 'Mail Server Error',
      message: err.message || 'Error communicating with mail server',
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
  });
}
