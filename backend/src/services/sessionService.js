import db from '../db/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'novamail-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Session Service - Manages JWT sessions and validation
 */

/**
 * Create a new session and generate JWT token
 */
export async function createSession(user, metadata = {}) {
  const jti = uuidv4(); // Unique JWT ID
  const expiresIn = JWT_EXPIRES_IN;
  
  // Calculate expiration date
  const expiresAt = new Date();
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (match) {
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd': expiresAt.setDate(expiresAt.getDate() + num); break;
      case 'h': expiresAt.setHours(expiresAt.getHours() + num); break;
      case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + num); break;
      case 's': expiresAt.setSeconds(expiresAt.getSeconds() + num); break;
    }
  }

  // Create JWT token
  const token = jwt.sign(
    {
      jti,
      userId: user.id,
      email: user.email,
      passwordVersion: user.passwordVersion,
    },
    JWT_SECRET,
    { expiresIn }
  );

  // Store session in database
  await db('sessions').insert({
    user_id: user.id,
    token,
    jti,
    password_version: user.passwordVersion,
    ip_address: metadata.ipAddress || null,
    user_agent: metadata.userAgent || null,
    expires_at: expiresAt,
  });

  return { token, jti, expiresAt };
}

/**
 * Validate a JWT token and session
 */
export async function validateSession(token) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists in database
    const session = await db('sessions')
      .where({ jti: decoded.jti })
      .first();

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await db('sessions').where({ id: session.id }).delete();
      return { valid: false, reason: 'Session expired' };
    }

    // Check if password version matches (password was changed)
    if (session.password_version !== decoded.passwordVersion) {
      await db('sessions').where({ id: session.id }).delete();
      return { valid: false, reason: 'Password changed' };
    }

    // Update last_used_at
    await db('sessions')
      .where({ id: session.id })
      .update({ last_used_at: db.fn.now() });

    return {
      valid: true,
      session,
      user: {
        id: decoded.userId,
        email: decoded.email,
        passwordVersion: decoded.passwordVersion,
      },
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, reason: 'Token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, reason: 'Invalid token' };
    }
    throw error;
  }
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(jti) {
  await db('sessions').where({ jti }).delete();
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId) {
  await db('sessions').where({ user_id: userId }).delete();
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId) {
  const sessions = await db('sessions')
    .where({ user_id: userId })
    .where('expires_at', '>', db.fn.now())
    .orderBy('last_used_at', 'desc');

  return sessions.map(session => ({
    id: session.id,
    jti: session.jti,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    createdAt: session.created_at,
    lastUsedAt: session.last_used_at,
    expiresAt: session.expires_at,
  }));
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  const deleted = await db('sessions')
    .where('expires_at', '<', db.fn.now())
    .delete();

  return { deleted };
}
