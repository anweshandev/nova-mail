import { Router } from 'express';
import { generateToken } from '../middleware/auth.js';
import { createImapService } from '../services/imap.js';
import { createSmtpService } from '../services/smtp.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  imapServer: z.string().min(1, 'IMAP server is required'),
  imapPort: z.number().optional().default(993),
  smtpServer: z.string().min(1, 'SMTP server is required'),
  smtpPort: z.number().optional().default(587),
});

/**
 * POST /api/auth/login
 * Authenticate user with IMAP/SMTP credentials
 */
router.post('/login', async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }
    
    const { email, password, imapServer, imapPort, smtpServer, smtpPort } = validation.data;
    
    // Use client-provided server settings directly
    const imap = {
      host: imapServer,
      port: imapPort || 993,
      user: email,
      pass: password,
    };
    
    const smtp = {
      host: smtpServer,
      port: smtpPort || 587,
      user: email,
      pass: password,
    };
    
    // Test IMAP connection
    const imapService = createImapService(imap);
    
    try {
      await imapService.testConnection();
    } catch (error) {
      console.error('IMAP connection failed:', error.message);
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Unable to connect to mail server. Please check your credentials and server settings.',
        details: error.message,
      });
    }
    
    // Optionally test SMTP connection
    try {
      const smtpService = createSmtpService(smtp);
      await smtpService.verify();
    } catch (error) {
      console.warn('SMTP verification failed:', error.message);
      // Don't fail login, SMTP might work for sending anyway
    }
    
    // Generate JWT token with encrypted credentials
    const token = generateToken({
      email,
      name: email.split('@')[0],
      imap,
      smtp,
    });
    
    // Get mailbox info
    let mailboxes = [];
    try {
      mailboxes = await imapService.getMailboxes();
    } catch (error) {
      console.warn('Failed to fetch mailboxes:', error.message);
    }
    
    res.json({
      success: true,
      token,
      user: {
        email,
        name: email.split('@')[0],
        avatar: null,
      },
      mailboxes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session (client-side token removal)
 */
router.post('/logout', (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint exists for potential future session management
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/verify
 * Verify if current token is valid
 */
router.post('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        message: 'No token provided',
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Import verify function here to avoid circular dependency
    const { default: jwt } = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pmail-secret-key-change-in-production');
    
    res.json({
      valid: true,
      user: {
        email: decoded.email,
        name: decoded.name,
      },
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      message: 'Invalid or expired token',
    });
  }
});

/**
 * POST /api/auth/autoconfig
 * Get server configuration for an email domain
 */
router.post('/autoconfig', async (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address',
    });
  }
  
  const domain = email.split('@')[1];
  
  // Try to fetch autoconfig from docker-mailserver
  const autoconfigUrl = process.env.AUTOCONFIG_URL;
  
  if (autoconfigUrl) {
    try {
      const response = await fetch(`${autoconfigUrl}/mail/config-v1.1.xml?emailaddress=${email}`);
      if (response.ok) {
        // Parse and return autoconfig
        const xml = await response.text();
        // For simplicity, return a parsed version
        res.json({
          found: true,
          source: 'autoconfig',
          config: parseAutoconfig(xml),
        });
        return;
      }
    } catch (error) {
      console.warn('Autoconfig fetch failed:', error.message);
    }
  }
  
  // Return domain-based defaults
  res.json({
    found: true,
    source: 'domain-derived',
    config: {
      imap: {
        host: `mail.${domain}`,
        port: 993,
        secure: true,
      },
      smtp: {
        host: `mail.${domain}`,
        port: 587,
        secure: false,
      },
    },
  });
});

/**
 * Parse Mozilla autoconfig XML (simplified)
 */
function parseAutoconfig(xml) {
  // Simple regex-based parsing
  const getMatch = (pattern) => {
    const match = xml.match(pattern);
    return match ? match[1] : null;
  };
  
  return {
    imap: {
      host: getMatch(/<incomingServer[^>]*type="imap"[^>]*>[\s\S]*?<hostname>([^<]+)<\/hostname>/i) || '',
      port: parseInt(getMatch(/<incomingServer[^>]*type="imap"[^>]*>[\s\S]*?<port>(\d+)<\/port>/i)) || 993,
      secure: true,
    },
    smtp: {
      host: getMatch(/<outgoingServer[^>]*>[\s\S]*?<hostname>([^<]+)<\/hostname>/i) || '',
      port: parseInt(getMatch(/<outgoingServer[^>]*>[\s\S]*?<port>(\d+)<\/port>/i)) || 587,
      secure: false,
    },
  };
}

export default router;
