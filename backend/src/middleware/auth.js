import jwt from 'jsonwebtoken';
import {
  getSessionByJti,
  getUserById,
  getUserPassword,
  updateSessionLastUsed,
} from '../services/pocketbase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Authentication middleware - verifies JWT token and validates session in PocketBase
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check session exists in database
    const session = await getSessionByJti(decoded.jti);
    if (!session) {
      return res.status(401).json({
        error: 'Invalid Session',
        message: 'Session has been revoked or expired',
      });
    }
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      return res.status(401).json({
        error: 'Session Expired',
        message: 'Your session has expired. Please login again.',
      });
    }
    
    // Get user from database
    const user = await getUserById(session.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User Not Found',
        message: 'User account no longer exists',
      });
    }
    
    // Check password version matches (invalidate if password changed)
    if (session.passwordVersion !== user.passwordVersion) {
      return res.status(401).json({
        error: 'Password Changed',
        message: 'Password was changed. Please login again.',
      });
    }
    
    // Get decrypted password
    const password = await getUserPassword(user.id);
    
    // Update last used timestamp (fire and forget)
    updateSessionLastUsed(session.id).catch(() => {});
    
    // Attach user credentials to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordVersion: user.passwordVersion,
      sessionJti: decoded.jti,
      // IMAP/SMTP credentials for mail operations
      imap: {
        host: user.imapHost,
        port: user.imapPort,
        security: user.imapSecurity,
        user: user.email,
        pass: password,
      },
      smtp: {
        host: user.smtpHost,
        port: user.smtpPort,
        security: user.smtpSecurity,
        user: user.email,
        pass: password,
      },
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Your session has expired. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Invalid authentication token',
      });
    }
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Failed to authenticate request',
    });
  }
}
