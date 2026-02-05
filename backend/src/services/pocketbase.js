import PocketBase from 'pocketbase';
import crypto from 'crypto';

/**
 * PocketBase Service - Handles database operations via PocketBase
 */

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';

// Create PocketBase client
const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation for server-side usage
pb.autoCancellation(false);

/**
 * Initialize PocketBase collections (run once on first setup)
 * This is handled by PocketBase admin UI or migrations, but we can check connection
 */
export async function initPocketBase() {
  try {
    const health = await pb.health.check();
    console.log('✅ PocketBase connected:', health);
    return true;
  } catch (error) {
    console.error('❌ PocketBase connection failed:', error.message);
    console.log('💡 Make sure PocketBase is running at:', POCKETBASE_URL);
    console.log('💡 Download PocketBase from: https://pocketbase.io/docs/');
    return false;
  }
}

// ============ Encryption Helpers ============

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, 'novamail-salt', 100000, KEY_LENGTH, 'sha256');
}

export function encryptPassword(plaintext) {
  if (!plaintext) throw new Error('Cannot encrypt empty password');
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decryptPassword(encrypted) {
  if (!encrypted) throw new Error('Cannot decrypt empty string');
  const key = getEncryptionKey();
  const [ivHex, encryptedHex, authTagHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============ User Operations ============

/**
 * Create or update user
 */
export async function upsertUser(userData) {
  const {
    email,
    password,
    name,
    imapHost,
    imapPort,
    imapSecurity,
    smtpHost,
    smtpPort,
    smtpSecurity,
  } = userData;

  const encryptedPassword = encryptPassword(password);

  try {
    // Try to find existing user
    const existing = await pb.collection('users').getFirstListItem(`email="${email.toLowerCase()}"`);
    
    // Update existing user
    const updated = await pb.collection('users').update(existing.id, {
      encrypted_password: encryptedPassword,
      name,
      imap_host: imapHost,
      imap_port: imapPort,
      imap_security: imapSecurity || 'SSL/TLS',
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_security: smtpSecurity || 'STARTTLS',
      password_version: (existing.password_version || 1) + 1,
      last_login_at: new Date().toISOString(),
    });
    
    return formatUser(updated);
  } catch (error) {
    if (error.status === 404) {
      // Create new user
      const created = await pb.collection('users').create({
        email: email.toLowerCase(),
        encrypted_password: encryptedPassword,
        name,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_security: imapSecurity || 'SSL/TLS',
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_security: smtpSecurity || 'STARTTLS',
        password_version: 1,
        last_login_at: new Date().toISOString(),
      });
      
      return formatUser(created);
    }
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  try {
    const user = await pb.collection('users').getFirstListItem(`email="${email.toLowerCase()}"`);
    return formatUser(user);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id) {
  try {
    const user = await pb.collection('users').getOne(id);
    return formatUser(user);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Get decrypted password for a user
 */
export async function getUserPassword(userId) {
  try {
    const user = await pb.collection('users').getOne(userId);
    return decryptPassword(user.encrypted_password);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function formatUser(record) {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    imapHost: record.imap_host,
    imapPort: record.imap_port,
    imapSecurity: record.imap_security,
    smtpHost: record.smtp_host,
    smtpPort: record.smtp_port,
    smtpSecurity: record.smtp_security,
    passwordVersion: record.password_version || 1,
    createdAt: record.created,
    updatedAt: record.updated,
    lastLoginAt: record.last_login_at,
  };
}

// ============ Session Operations ============

/**
 * Create a new session
 */
export async function createSession(user, jti, token, expiresAt, metadata = {}) {
  const session = await pb.collection('sessions').create({
    user_id: user.id,
    jti,
    token,
    password_version: user.passwordVersion,
    ip_address: metadata.ipAddress || '',
    user_agent: metadata.userAgent || '',
    expires_at: expiresAt.toISOString(),
    last_used_at: new Date().toISOString(),
  });
  
  return {
    id: session.id,
    jti: session.jti,
    expiresAt: session.expires_at,
  };
}

/**
 * Get session by JTI
 */
export async function getSessionByJti(jti) {
  try {
    const session = await pb.collection('sessions').getFirstListItem(`jti="${jti}"`);
    return {
      id: session.id,
      userId: session.user_id,
      jti: session.jti,
      passwordVersion: session.password_version,
      expiresAt: new Date(session.expires_at),
      lastUsedAt: session.last_used_at,
    };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Update session last used
 */
export async function updateSessionLastUsed(sessionId) {
  await pb.collection('sessions').update(sessionId, {
    last_used_at: new Date().toISOString(),
  });
}

/**
 * Revoke session by JTI
 */
export async function revokeSessionByJti(jti) {
  try {
    const session = await pb.collection('sessions').getFirstListItem(`jti="${jti}"`);
    await pb.collection('sessions').delete(session.id);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId) {
  try {
    const sessions = await pb.collection('sessions').getFullList({
      filter: `user_id="${userId}"`,
    });
    
    for (const session of sessions) {
      await pb.collection('sessions').delete(session.id);
    }
    
    return sessions.length;
  } catch (error) {
    console.error('Error revoking sessions:', error);
    return 0;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId) {
  try {
    const now = new Date().toISOString();
    const sessions = await pb.collection('sessions').getFullList({
      filter: `user_id="${userId}" && expires_at>"${now}"`,
      sort: '-last_used_at',
    });
    
    return sessions.map(s => ({
      id: s.id,
      jti: s.jti,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created,
      lastUsedAt: s.last_used_at,
      expiresAt: s.expires_at,
    }));
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  try {
    const now = new Date().toISOString();
    const expired = await pb.collection('sessions').getFullList({
      filter: `expires_at<"${now}"`,
    });
    
    for (const session of expired) {
      await pb.collection('sessions').delete(session.id);
    }
    
    return { deleted: expired.length };
  } catch (error) {
    console.error('Session cleanup error:', error);
    return { deleted: 0 };
  }
}

// ============ User Settings ============

/**
 * Get user settings
 */
export async function getUserSettings(userId) {
  try {
    const settings = await pb.collection('user_settings').getFirstListItem(`user_id="${userId}"`);
    return {
      signature: settings.signature,
      autoBcc: settings.auto_bcc,
      defaultFolder: settings.default_folder,
      readingPane: settings.reading_pane,
      emailsPerPage: settings.emails_per_page,
      showImages: settings.show_images,
    };
  } catch (error) {
    if (error.status === 404) {
      // Create default settings
      const created = await pb.collection('user_settings').create({
        user_id: userId,
        reading_pane: 'right',
        emails_per_page: 50,
        default_folder: 'INBOX',
        show_images: false,
        auto_bcc: false,
      });
      return getUserSettings(userId);
    }
    throw error;
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId, settings) {
  try {
    const existing = await pb.collection('user_settings').getFirstListItem(`user_id="${userId}"`);
    
    const updateData = {};
    if (settings.signature !== undefined) updateData.signature = settings.signature;
    if (settings.autoBcc !== undefined) updateData.auto_bcc = settings.autoBcc;
    if (settings.defaultFolder !== undefined) updateData.default_folder = settings.defaultFolder;
    if (settings.readingPane !== undefined) updateData.reading_pane = settings.readingPane;
    if (settings.emailsPerPage !== undefined) updateData.emails_per_page = settings.emailsPerPage;
    if (settings.showImages !== undefined) updateData.show_images = settings.showImages;
    
    await pb.collection('user_settings').update(existing.id, updateData);
    return getUserSettings(userId);
  } catch (error) {
    if (error.status === 404) {
      await pb.collection('user_settings').create({
        user_id: userId,
        ...settings,
      });
      return getUserSettings(userId);
    }
    throw error;
  }
}

export default pb;
