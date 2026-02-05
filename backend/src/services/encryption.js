import crypto from 'crypto';

/**
 * Encryption Service - Handles password encryption/decryption
 * Uses AES-256-GCM for secure encryption of passwords
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from secret
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in environment variables');
  }
  
  // Use PBKDF2 to derive a proper encryption key
  return crypto.pbkdf2Sync(secret, 'novamail-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a password
 * @param {string} plaintext - The password to encrypt
 * @returns {string} Encrypted password in format: iv:encrypted:authTag
 */
export function encryptPassword(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty password');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  // Return format: iv:encrypted:authTag (all in hex)
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt a password
 * @param {string} encrypted - The encrypted password string
 * @returns {string} Decrypted password
 */
export function decryptPassword(encrypted) {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty string');
  }

  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }

  const [ivHex, encryptedHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a secure random encryption key (for initial setup)
 * @returns {string} A hex-encoded 32-byte key
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
