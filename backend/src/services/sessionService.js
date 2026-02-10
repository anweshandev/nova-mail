import db from '../db/index.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserById } from './userService.js';

/**
 * Session Service - Handles JWT session management
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Create a new session and generate JWT token
 */
export async function createSession(user, metadata = {}) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Generate JWT token
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      jti,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Store session in database
  await db('sessions').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    jti,
    token,
    password_version: user.passwordVersion,
    ip_address: metadata.ipAddress || null,
    user_agent: metadata.userAgent || null,
    expires_at: expiresAt.toISOString(),
    last_used_at: new Date().toISOString(),
  });

  return {
    token,
    expiresAt,
    jti,
  };
}

/**
 * Validate a session token
 */
export async function validateSession(token) {
  try {
    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check session exists in database
    const session = await db('sessions')
      .where('jti', decoded.jti)
      .first();
    
    if (!session) {
      return { valid: false, reason: 'Session not found or revoked' };
    }
    
    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      return { valid: false, reason: 'Session expired' };
    }
    
    // Get user and check password version
    const user = await getUserById(session.user_id);
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }
    
    if (session.password_version !== user.passwordVersion) {
      return { valid: false, reason: 'Password changed, please login again' };
    }
    
    // Update last used timestamp
    await db('sessions')
      .where('id', session.id)
      .update({ last_used_at: new Date().toISOString() });
    
    return {
      valid: true,
      user,
      session: {
        id: session.id,
        jti: session.jti,
        expiresAt: session.expires_at,
      },
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, reason: 'Token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, reason: 'Invalid token' };
    }
    return { valid: false, reason: 'Authentication failed' };
  }
}

/**
 * Revoke a session by JTI
 */
export async function revokeSession(jti) {
  await db('sessions').where('jti', jti).delete();
  return true;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId) {
  const result = await db('sessions').where('user_id', userId).delete();
  return { revoked: result };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId) {
  const now = new Date().toISOString();
  const sessions = await db('sessions')
    .where('user_id', userId)
    .where('expires_at', '>', now)
    .orderBy('last_used_at', 'desc');
  
  return sessions.map(s => ({
    id: s.id,
    jti: s.jti,
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    lastUsedAt: s.last_used_at,
    expiresAt: s.expires_at,
  }));
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  const now = new Date().toISOString();
  const deleted = await db('sessions')
    .where('expires_at', '<', now)
    .delete();
  
  return { deleted };
}
