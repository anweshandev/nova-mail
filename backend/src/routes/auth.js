import { Router } from 'express';
import { generateToken } from '../middleware/auth.js';
import { createImapService } from '../services/imap.js';
import { createSmtpService } from '../services/smtp.js';
import { z } from 'zod';

const router = Router();

// Validation schemas - imapServer/smtpServer are now optional (will be auto-discovered)
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  imapServer: z.string().optional(),
  imapPort: z.number().optional(),
  imapSecurity: z.enum(['SSL/TLS', 'STARTTLS', 'None']).optional(),
  smtpServer: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecurity: z.enum(['SSL/TLS', 'STARTTLS', 'None']).optional(),
});

/**
 * Fetch autoconfig/autodiscover for a domain
 * Tries multiple standard endpoints used by docker-mailserver and other mail servers
 */
async function discoverMailConfig(email) {
  const domain = email.split('@')[1];
  
  // Standard autoconfig/autodiscover URL patterns
  const autoconfigUrls = [
    `https://autoconfig.${domain}/mail/config-v1.1.xml?emailaddress=${encodeURIComponent(email)}`,
    `https://autodiscover.${domain}/mail/config-v1.1.xml?emailaddress=${encodeURIComponent(email)}`,
    `https://${domain}/.well-known/autoconfig/mail/config-v1.1.xml?emailaddress=${encodeURIComponent(email)}`,
  ];
  
  const autodiscoverUrls = [
    `https://autoconfig.${domain}/autodiscover/autodiscover.xml`,
    `https://autodiscover.${domain}/autodiscover/autodiscover.xml`,
    `https://${domain}/autodiscover/autodiscover.xml`,
  ];

  // Try Mozilla autoconfig first (preferred for IMAP/SMTP)
  for (const url of autoconfigUrls) {
    try {
      console.log(`Trying autoconfig: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/xml, text/xml' },
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const xml = await response.text();
        const config = parseAutoconfig(xml);
        if (config.imap.host && config.smtp.host) {
          console.log(`Autoconfig found at ${url}`);
          return { found: true, source: 'autoconfig', config };
        }
      }
    } catch (error) {
      console.log(`Autoconfig failed for ${url}: ${error.message}`);
    }
  }

  // Try Microsoft Autodiscover
  for (const url of autodiscoverUrls) {
    try {
      console.log(`Trying autodiscover: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      // Autodiscover requires POST with XML body
      const autodiscoverRequest = `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>${email}</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>`;

      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/xml',
          'Accept': 'application/xml, text/xml',
        },
        body: autodiscoverRequest,
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const xml = await response.text();
        const config = parseAutodiscover(xml);
        if (config.imap.host || config.smtp.host) {
          console.log(`Autodiscover found at ${url}`);
          return { found: true, source: 'autodiscover', config };
        }
      }
    } catch (error) {
      console.log(`Autodiscover failed for ${url}: ${error.message}`);
    }
  }

  // Fallback: try common mail server patterns
  const fallbackConfig = {
    imap: { host: `mail.${domain}`, port: 993, secure: true, starttls: false },
    smtp: { host: `mail.${domain}`, port: 465, secure: true, starttls: false },
  };
  
  console.log(`No autoconfig found, using fallback: mail.${domain}`);
  return { found: false, source: 'fallback', config: fallbackConfig };
}

/**
 * Parse Mozilla autoconfig XML
 */
function parseAutoconfig(xml) {
  const getTagContent = (xml, serverType, tagName) => {
    // Match the server block first
    const serverPattern = serverType === 'imap' 
      ? /<incomingServer[^>]*type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/i
      : /<outgoingServer[^>]*>([\s\S]*?)<\/outgoingServer>/i;
    
    const serverMatch = xml.match(serverPattern);
    if (!serverMatch) return null;
    
    const serverBlock = serverMatch[1];
    const tagPattern = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i');
    const tagMatch = serverBlock.match(tagPattern);
    return tagMatch ? tagMatch[1].trim() : null;
  };

  const imapHost = getTagContent(xml, 'imap', 'hostname');
  const imapPort = getTagContent(xml, 'imap', 'port');
  const imapSocket = getTagContent(xml, 'imap', 'socketType');
  
  const smtpHost = getTagContent(xml, 'smtp', 'hostname');
  const smtpPort = getTagContent(xml, 'smtp', 'port');
  const smtpSocket = getTagContent(xml, 'smtp', 'socketType');

  return {
    imap: {
      host: imapHost || '',
      port: parseInt(imapPort) || 993,
      secure: imapSocket?.toUpperCase() === 'SSL',
      starttls: imapSocket?.toUpperCase() === 'STARTTLS',
    },
    smtp: {
      host: smtpHost || '',
      port: parseInt(smtpPort) || 587,
      secure: smtpSocket?.toUpperCase() === 'SSL',
      starttls: smtpSocket?.toUpperCase() === 'STARTTLS',
    },
  };
}

/**
 * Parse Microsoft Autodiscover XML
 */
function parseAutodiscover(xml) {
  const getProtocol = (xml, type) => {
    const pattern = new RegExp(
      `<Protocol>\\s*<Type>${type}</Type>([\\s\\S]*?)</Protocol>`,
      'i'
    );
    const match = xml.match(pattern);
    if (!match) return null;
    
    const block = match[1];
    const server = block.match(/<Server>([^<]+)<\/Server>/i);
    const port = block.match(/<Port>(\d+)<\/Port>/i);
    const ssl = block.match(/<SSL>(on|off)<\/SSL>/i);
    
    return {
      host: server ? server[1].trim() : '',
      port: port ? parseInt(port[1]) : null,
      secure: ssl ? ssl[1].toLowerCase() === 'on' : true,
    };
  };

  const imap = getProtocol(xml, 'IMAP') || { host: '', port: 993, secure: true };
  const smtp = getProtocol(xml, 'SMTP') || { host: '', port: 587, secure: false };

  return { imap, smtp };
}

/**
 * POST /api/auth/login
 * Authenticate user with IMAP/SMTP credentials
 * Auto-discovers server settings if not provided
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
    
    let { email, password, imapServer, imapPort, imapSecurity, smtpServer, smtpPort, smtpSecurity } = validation.data;
    
    // Auto-discover server settings if not provided
    if (!imapServer || !smtpServer) {
      console.log(`Auto-discovering mail config for ${email}...`);
      const discovery = await discoverMailConfig(email);
      
      if (!imapServer) {
        imapServer = discovery.config.imap.host;
        imapPort = imapPort || discovery.config.imap.port;
        // Determine security from discovery if not provided
        if (!imapSecurity) {
          if (discovery.config.imap.secure) {
            imapSecurity = 'SSL/TLS';
          } else if (discovery.config.imap.starttls) {
            imapSecurity = 'STARTTLS';
          } else {
            imapSecurity = 'None';
          }
        }
      }
      if (!smtpServer) {
        smtpServer = discovery.config.smtp.host;
        smtpPort = smtpPort || discovery.config.smtp.port;
        // Determine security from discovery if not provided
        if (!smtpSecurity) {
          if (discovery.config.smtp.secure) {
            smtpSecurity = 'SSL/TLS';
          } else if (discovery.config.smtp.starttls) {
            smtpSecurity = 'STARTTLS';
          } else {
            smtpSecurity = 'None';
          }
        }
      }
      
      console.log(`Using discovered config - IMAP: ${imapServer}:${imapPort} (${imapSecurity}), SMTP: ${smtpServer}:${smtpPort} (${smtpSecurity})`);
    }
    
    // Validate we have server settings now
    if (!imapServer || !smtpServer) {
      return res.status(400).json({
        error: 'Configuration Error',
        message: 'Could not determine mail server settings. Please provide IMAP and SMTP server addresses.',
      });
    }
    
    const imap = {
      host: imapServer,
      port: imapPort || 993,
      security: imapSecurity || 'SSL/TLS',
      user: email,
      pass: password,
    };
    
    const smtp = {
      host: smtpServer,
      port: smtpPort || 465,
      security: smtpSecurity || 'SSL/TLS',
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'novamail-secret-key-change-in-production');
    
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
 * Uses autodiscover/autoconfig endpoints based on the email domain
 */
router.post('/autoconfig', async (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Please provide a valid email address',
    });
  }
  
  try {
    const discovery = await discoverMailConfig(email);
    res.json(discovery);
  } catch (error) {
    console.error('Autoconfig error:', error);
    const domain = email.split('@')[1];
    res.json({
      found: false,
      source: 'fallback',
      config: {
        imap: { host: `mail.${domain}`, port: 993, secure: true, starttls: false },
        smtp: { host: `mail.${domain}`, port: 465, secure: true, starttls: false },
      },
    });
  }
});

export default router;
