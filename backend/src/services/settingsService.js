import db from '../db/index.js';

/**
 * Default user settings
 */
const DEFAULT_SETTINGS = {
  display_density: 'default',
  theme: 'system',
  conversation_view: true,
  reading_pane: 'right',
  auto_advance: true,
  desktop_notifications: false,
  signature: '',
  use_signature: false,
  send_cancellation_seconds: 5,
};

/**
 * Get user settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User settings
 */
export async function getUserSettings(userId) {
  const settings = await db('user_settings').where({ user_id: userId }).first();
  
  if (!settings) {
    return {
      displayDensity: DEFAULT_SETTINGS.display_density,
      theme: DEFAULT_SETTINGS.theme,
      conversationView: DEFAULT_SETTINGS.conversation_view,
      previewPane: DEFAULT_SETTINGS.reading_pane,
      autoAdvance: DEFAULT_SETTINGS.auto_advance,
      desktopNotifications: DEFAULT_SETTINGS.desktop_notifications,
      signature: DEFAULT_SETTINGS.signature,
      useSignature: DEFAULT_SETTINGS.use_signature,
      sendCancellation: DEFAULT_SETTINGS.send_cancellation_seconds,
    };
  }
  
  return {
    displayDensity: settings.display_density,
    theme: settings.theme,
    conversationView: settings.conversation_view,
    previewPane: settings.reading_pane,
    autoAdvance: settings.auto_advance,
    desktopNotifications: settings.desktop_notifications,
    signature: settings.signature || '',
    useSignature: settings.use_signature,
    sendCancellation: settings.send_cancellation_seconds,
  };
}

/**
 * Update user settings
 * @param {string} userId - User ID
 * @param {Object} updates - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export async function updateUserSettings(userId, updates) {
  // Map camelCase to snake_case
  const dbUpdates = {};
  
  if (updates.displayDensity !== undefined) dbUpdates.display_density = updates.displayDensity;
  if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
  if (updates.conversationView !== undefined) dbUpdates.conversation_view = updates.conversationView;
  if (updates.previewPane !== undefined) dbUpdates.reading_pane = updates.previewPane;
  if (updates.autoAdvance !== undefined) dbUpdates.auto_advance = updates.autoAdvance;
  if (updates.desktopNotifications !== undefined) dbUpdates.desktop_notifications = updates.desktopNotifications;
  if (updates.signature !== undefined) dbUpdates.signature = updates.signature;
  if (updates.useSignature !== undefined) dbUpdates.use_signature = updates.useSignature;
  if (updates.sendCancellation !== undefined) dbUpdates.send_cancellation_seconds = updates.sendCancellation;
  
  dbUpdates.updated_at = new Date().toISOString();
  
  // Check if settings exist
  const existing = await db('user_settings').where({ user_id: userId }).first();
  
  if (existing) {
    await db('user_settings').where({ user_id: userId }).update(dbUpdates);
  } else {
    await db('user_settings').insert({
      user_id: userId,
      ...DEFAULT_SETTINGS,
      ...dbUpdates,
      created_at: new Date().toISOString(),
    });
  }
  
  return getUserSettings(userId);
}

/**
 * Update signature
 * @param {string} userId - User ID
 * @param {string} signature - Email signature
 * @param {boolean} useSignature - Whether to use signature
 * @returns {Promise<Object>} Updated signature settings
 */
export async function updateSignature(userId, signature, useSignature) {
  await updateUserSettings(userId, { signature, useSignature });
  return { signature, useSignature };
}

/**
 * Get signature
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Signature settings
 */
export async function getSignature(userId) {
  const settings = await getUserSettings(userId);
  return {
    signature: settings.signature,
    useSignature: settings.useSignature,
  };
}
