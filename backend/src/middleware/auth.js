import { validateSession } from '../services/sessionService.js';
import { getUserPassword } from '../services/userService.js';

/**
 * Authentication middleware - verifies JWT token and validates session
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
    // Validate session in database
    const validation = await validateSession(token);
    
    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid Session',
        message: validation.reason || 'Session is no longer valid',
      });
    }
    
    const { user, session } = validation;
    
    // Get decrypted password
    const password = await getUserPassword(user.id);
    
    // Attach user credentials to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordVersion: user.passwordVersion,
      sessionJti: session.jti,
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
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Failed to authenticate request',
    });
  }
}
