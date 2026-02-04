import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'novamail-secret-key-change-in-production';

/**
 * Authentication middleware - verifies JWT token and attaches user credentials
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user credentials to request
    req.user = {
      email: decoded.email,
      name: decoded.name,
      // IMAP/SMTP credentials (encrypted in token)
      imap: decoded.imap,
      smtp: decoded.smtp,
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Authentication token has expired. Please login again.',
      });
    }
    
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Authentication token is invalid',
    });
  }
}

/**
 * Generate JWT token with user credentials
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
