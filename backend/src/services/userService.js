import db from '../db/index.js';
import { encryptPassword, decryptPassword } from './encryption.js';
import crypto from 'crypto';

/**
 * User Service - Handles user CRUD operations
 */

/**
 * Create a new user
 */
export async function createUser(userData) {
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
  const id = crypto.randomUUID();

  await db('users').insert({
    id,
    email: email.toLowerCase(),
    encrypted_password: encryptedPassword,
    name: name || email.split('@')[0],
    imap_host: imapHost,
    imap_port: imapPort || 993,
    imap_security: imapSecurity || 'SSL/TLS',
    smtp_host: smtpHost,
    smtp_port: smtpPort || 465,
    smtp_security: smtpSecurity || 'SSL/TLS',
    password_version: 1,
    last_login_at: new Date().toISOString(),
  });

  return getUserById(id);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  const user = await db('users')
    .where('email', email.toLowerCase())
    .first();
  
  return user ? formatUser(user) : null;
}

/**
 * Get user by ID
 */
export async function getUserById(id) {
  const user = await db('users').where('id', id).first();
  return user ? formatUser(user) : null;
}

/**
 * Update user
 */
export async function updateUser(id, updates) {
  const updateData = { updated_at: new Date().toISOString() };

  if (updates.password) {
    updateData.encrypted_password = encryptPassword(updates.password);
    // Increment password version to invalidate existing sessions
    updateData.password_version = db.raw('password_version + 1');
  }
  if (updates.name) updateData.name = updates.name;
  if (updates.imapHost) updateData.imap_host = updates.imapHost;
  if (updates.imapPort) updateData.imap_port = updates.imapPort;
  if (updates.imapSecurity) updateData.imap_security = updates.imapSecurity;
  if (updates.smtpHost) updateData.smtp_host = updates.smtpHost;
  if (updates.smtpPort) updateData.smtp_port = updates.smtpPort;
  if (updates.smtpSecurity) updateData.smtp_security = updates.smtpSecurity;

  await db('users').where('id', id).update(updateData);
  return getUserById(id);
}

/**
 * Update or create user (upsert)
 */
export async function upsertUser(userData) {
  const existing = await getUserByEmail(userData.email);
  
  if (existing) {
    // Update existing user with new credentials
    await db('users').where('id', existing.id).update({
      encrypted_password: encryptPassword(userData.password),
      imap_host: userData.imapHost,
      imap_port: userData.imapPort || 993,
      imap_security: userData.imapSecurity || 'SSL/TLS',
      smtp_host: userData.smtpHost,
      smtp_port: userData.smtpPort || 465,
      smtp_security: userData.smtpSecurity || 'SSL/TLS',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return getUserById(existing.id);
  }
  
  return createUser(userData);
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId) {
  await db('users').where('id', userId).update({
    last_login_at: new Date().toISOString(),
  });
}

/**
 * Get decrypted password for a user
 */
export async function getUserPassword(userId) {
  const user = await db('users').where('id', userId).first();
  if (!user) return null;
  return decryptPassword(user.encrypted_password);
}

/**
 * Delete user and all related data
 */
export async function deleteUser(id) {
  await db('users').where('id', id).delete();
  return true;
}

/**
 * Format user object for external use
 */
function formatUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    imapHost: user.imap_host,
    imapPort: user.imap_port,
    imapSecurity: user.imap_security,
    smtpHost: user.smtp_host,
    smtpPort: user.smtp_port,
    smtpSecurity: user.smtp_security,
    passwordVersion: user.password_version,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}
