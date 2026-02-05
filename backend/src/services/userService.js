import db from '../db/index.js';
import { encryptPassword, decryptPassword } from './encryption.js';

/**
 * User Model - Database operations for users
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

  const [userId] = await db('users').insert({
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
  });

  // Create default settings
  await db('user_settings').insert({
    user_id: userId,
  });

  return getUserById(userId);
}

/**
 * Get user by ID
 */
export async function getUserById(id) {
  const user = await db('users').where({ id }).first();
  if (!user) return null;

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

/**
 * Get user by email
 */
export async function getUserByEmail(email) {
  const user = await db('users').where({ email: email.toLowerCase() }).first();
  if (!user) return null;

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

/**
 * Get decrypted password for a user
 */
export async function getUserPassword(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) return null;

  return decryptPassword(user.encrypted_password);
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId) {
  await db('users')
    .where({ id: userId })
    .update({
      last_login_at: db.fn.now(),
    });
}

/**
 * Update user password (increments password_version)
 */
export async function updateUserPassword(userId, newPassword) {
  const encryptedPassword = encryptPassword(newPassword);
  
  const user = await db('users').where({ id: userId }).first();
  const newPasswordVersion = (user?.password_version || 1) + 1;

  await db('users')
    .where({ id: userId })
    .update({
      encrypted_password: encryptedPassword,
      password_version: newPasswordVersion,
      updated_at: db.fn.now(),
    });

  // Invalidate all existing sessions
  await db('sessions').where({ user_id: userId }).delete();

  return newPasswordVersion;
}

/**
 * Update user mail server settings
 */
export async function updateUserMailSettings(userId, settings) {
  const updateData = {};
  
  if (settings.imapHost) updateData.imap_host = settings.imapHost;
  if (settings.imapPort) updateData.imap_port = settings.imapPort;
  if (settings.imapSecurity) updateData.imap_security = settings.imapSecurity;
  if (settings.smtpHost) updateData.smtp_host = settings.smtpHost;
  if (settings.smtpPort) updateData.smtp_port = settings.smtpPort;
  if (settings.smtpSecurity) updateData.smtp_security = settings.smtpSecurity;

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = db.fn.now();
    await db('users').where({ id: userId }).update(updateData);
  }

  return getUserById(userId);
}

/**
 * Delete a user
 */
export async function deleteUser(userId) {
  await db('users').where({ id: userId }).delete();
}

/**
 * Get user settings
 */
export async function getUserSettings(userId) {
  const settings = await db('user_settings').where({ user_id: userId }).first();
  
  if (!settings) {
    // Create default settings if they don't exist
    await db('user_settings').insert({ user_id: userId });
    return getUserSettings(userId);
  }

  return {
    signature: settings.signature,
    autoBcc: settings.auto_bcc,
    defaultFolder: settings.default_folder,
    readingPane: settings.reading_pane,
    emailsPerPage: settings.emails_per_page,
    showImages: settings.show_images,
    desktopNotifications: settings.desktop_notifications,
    emailNotifications: settings.email_notifications,
  };
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId, settings) {
  const updateData = {};
  
  if (settings.signature !== undefined) updateData.signature = settings.signature;
  if (settings.autoBcc !== undefined) updateData.auto_bcc = settings.autoBcc;
  if (settings.defaultFolder !== undefined) updateData.default_folder = settings.defaultFolder;
  if (settings.readingPane !== undefined) updateData.reading_pane = settings.readingPane;
  if (settings.emailsPerPage !== undefined) updateData.emails_per_page = settings.emailsPerPage;
  if (settings.showImages !== undefined) updateData.show_images = settings.showImages;
  if (settings.desktopNotifications !== undefined) updateData.desktop_notifications = settings.desktopNotifications;
  if (settings.emailNotifications !== undefined) updateData.email_notifications = settings.emailNotifications;

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = db.fn.now();
    
    const exists = await db('user_settings').where({ user_id: userId }).first();
    if (exists) {
      await db('user_settings').where({ user_id: userId }).update(updateData);
    } else {
      await db('user_settings').insert({ user_id: userId, ...updateData });
    }
  }

  return getUserSettings(userId);
}
