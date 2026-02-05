import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

/**
 * Standard folder mappings based on IMAP special use flags (RFC 6154)
 * Maps common folder names to their specialUse flag
 */
const SPECIAL_USE_MAP = {
  sent: '\\Sent',
  drafts: '\\Drafts',
  trash: '\\Trash',
  junk: '\\Junk',
  spam: '\\Junk',
  archive: '\\Archive',
  all: '\\All',
  flagged: '\\Flagged',
  important: '\\Important',
};

/**
 * IMAP Service - Handles all IMAP operations for email fetching
 */
export class ImapService {
  constructor(config) {
    // Security type: 'SSL/TLS' (port 993), 'STARTTLS' (port 143), 'None' (port 143)
    const security = config.security || 'SSL/TLS';
    const isSecure = security === 'SSL/TLS';
    const useStartTls = security === 'STARTTLS';
    
    this.config = {
      host: config.host,
      port: config.port || (isSecure ? 993 : 143),
      secure: isSecure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      logger: false,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
    
    // For STARTTLS, we connect insecurely and upgrade
    if (useStartTls) {
      this.config.secure = false;
      this.config.tls = {
        ...this.config.tls,
        // ImapFlow handles STARTTLS automatically when secure is false
        // and the server advertises STARTTLS capability
      };
    }
    
    // For 'None', disable TLS entirely (not recommended for production)
    if (security === 'None') {
      this.config.secure = false;
      this.config.disableCompression = true;
    }
    
    // Cache for folder mappings
    this._folderCache = null;
  }

  /**
   * Create and connect an IMAP client
   */
  async connect() {
    const client = new ImapFlow(this.config);
    await client.connect();
    return client;
  }

  /**
   * Test connection with provided credentials
   */
  async testConnection() {
    const client = await this.connect();
    await client.logout();
    return true;
  }

  /**
   * Get list of all mailboxes/folders
   */
  async getMailboxes() {
    const client = await this.connect();
    try {
      const mailboxes = await client.list();
      
      // Build folder cache for future lookups
      this._folderCache = {};
      mailboxes.forEach(box => {
        // Map by lowercase name
        this._folderCache[box.name.toLowerCase()] = box.path;
        this._folderCache[box.path.toLowerCase()] = box.path;
        
        // Map by specialUse flag
        if (box.specialUse) {
          this._folderCache[box.specialUse.toLowerCase()] = box.path;
          // Also map common names to actual paths based on specialUse
          Object.entries(SPECIAL_USE_MAP).forEach(([name, flag]) => {
            if (box.specialUse === flag) {
              this._folderCache[name] = box.path;
            }
          });
        }
      });
      
      return mailboxes.map(box => ({
        name: box.name,
        path: box.path,
        delimiter: box.delimiter,
        flags: box.flags,
        specialUse: box.specialUse,
        subscribed: box.subscribed,
      }));
    } finally {
      await client.logout();
    }
  }
  
  /**
   * Resolve a folder name to its actual IMAP path
   * Handles case-insensitivity and specialUse mappings
   */
  async resolveFolderPath(folder, client = null) {
    // INBOX is always INBOX
    if (folder.toUpperCase() === 'INBOX') {
      return 'INBOX';
    }
    
    // Check cache first
    if (this._folderCache && this._folderCache[folder.toLowerCase()]) {
      return this._folderCache[folder.toLowerCase()];
    }
    
    // Need to refresh folder cache
    const needsDisconnect = !client;
    if (!client) {
      client = await this.connect();
    }
    
    try {
      const mailboxes = await client.list();
      
      // Build fresh cache
      this._folderCache = {};
      let resolvedPath = null;
      
      for (const box of mailboxes) {
        // Map by lowercase name
        this._folderCache[box.name.toLowerCase()] = box.path;
        this._folderCache[box.path.toLowerCase()] = box.path;
        
        // Check for exact match (case-insensitive)
        if (box.name.toLowerCase() === folder.toLowerCase() ||
            box.path.toLowerCase() === folder.toLowerCase()) {
          resolvedPath = box.path;
        }
        
        // Map by specialUse flag
        if (box.specialUse) {
          this._folderCache[box.specialUse.toLowerCase()] = box.path;
          
          // Check if requested folder matches a specialUse alias
          const expectedFlag = SPECIAL_USE_MAP[folder.toLowerCase()];
          if (expectedFlag && box.specialUse === expectedFlag) {
            resolvedPath = box.path;
          }
          
          // Also store reverse mapping
          Object.entries(SPECIAL_USE_MAP).forEach(([name, flag]) => {
            if (box.specialUse === flag) {
              this._folderCache[name] = box.path;
            }
          });
        }
      }
      
      if (needsDisconnect) {
        await client.logout();
      }
      
      return resolvedPath || folder; // Return original if not found
    } catch (error) {
      if (needsDisconnect && client) {
        await client.logout().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Get emails from a specific folder
   */
  async getEmails(folder = 'INBOX', options = {}) {
    const client = await this.connect();
    const { limit = 50, offset = 0, search } = options;
    
    try {
      // Resolve folder path (handles case-insensitivity and specialUse)
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      const mailbox = await client.mailboxOpen(resolvedFolder);
      
      // Check if mailbox is empty
      if (!mailbox.exists || mailbox.exists === 0) {
        return {
          emails: [],
          total: 0,
          folder: resolvedFolder,
          limit,
          offset,
        };
      }
      
      // Build search query
      let searchQuery = { all: true };
      if (search) {
        searchQuery = {
          or: [
            { subject: search },
            { from: search },
            { body: search },
          ],
        };
      }
      
      // Get message UIDs
      const messages = [];
      let count = 0;
      
      for await (const message of client.fetch(
        { all: true },
        { 
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          size: true,
        },
        { changedSince: 0 }
      )) {
        count++;
        if (count <= offset) continue;
        if (messages.length >= limit) break;
        
        messages.push({
          uid: message.uid,
          id: `${folder}-${message.uid}`,
          messageId: message.envelope?.messageId,
          from: message.envelope?.from?.[0] ? {
            name: message.envelope.from[0].name || '',
            email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
          } : { name: '', email: '' },
          to: (message.envelope?.to || []).map(addr => ({
            name: addr.name || '',
            email: `${addr.mailbox}@${addr.host}`,
          })),
          cc: (message.envelope?.cc || []).map(addr => ({
            name: addr.name || '',
            email: `${addr.mailbox}@${addr.host}`,
          })),
          bcc: (message.envelope?.bcc || []).map(addr => ({
            name: addr.name || '',
            email: `${addr.mailbox}@${addr.host}`,
          })),
          subject: message.envelope?.subject || '(no subject)',
          date: message.envelope?.date || new Date(),
          read: message.flags?.has('\\Seen') || false,
          starred: message.flags?.has('\\Flagged') || false,
          important: message.flags?.has('\\Important') || false,
          answered: message.flags?.has('\\Answered') || false,
          size: message.size,
          hasAttachments: this.hasAttachments(message.bodyStructure),
          snippet: '', // Will be populated when fetching body
          labels: [folder.toLowerCase()],
        });
      }
      
      // Reverse to get newest first
      messages.reverse();
      
      return {
        emails: messages,
        total: count,
        folder,
        limit,
        offset,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get a single email with full body
   */
  async getEmail(folder, uid) {
    const client = await this.connect();
    
    try {
      // Resolve folder path
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      // Fetch the message with body
      const message = await client.fetchOne(uid, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true,
      });
      
      if (!message) {
        throw new Error('Email not found');
      }
      
      // Parse the email
      const parsed = await simpleParser(message.source);
      
      // Extract attachments info
      const attachments = (parsed.attachments || []).map(att => ({
        id: att.contentId || att.checksum,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId,
      }));
      
      return {
        uid: message.uid,
        id: `${folder}-${message.uid}`,
        messageId: message.envelope?.messageId,
        from: message.envelope?.from?.[0] ? {
          name: message.envelope.from[0].name || '',
          email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
        } : { name: '', email: '' },
        to: (message.envelope?.to || []).map(addr => ({
          name: addr.name || '',
          email: `${addr.mailbox}@${addr.host}`,
        })),
        cc: (message.envelope?.cc || []).map(addr => ({
          name: addr.name || '',
          email: `${addr.mailbox}@${addr.host}`,
        })),
        bcc: (message.envelope?.bcc || []).map(addr => ({
          name: addr.name || '',
          email: `${addr.mailbox}@${addr.host}`,
        })),
        replyTo: parsed.replyTo?.value?.[0] || null,
        subject: message.envelope?.subject || '(no subject)',
        date: message.envelope?.date || new Date(),
        read: message.flags?.has('\\Seen') || false,
        starred: message.flags?.has('\\Flagged') || false,
        important: message.flags?.has('\\Important') || false,
        answered: message.flags?.has('\\Answered') || false,
        body: parsed.html || parsed.textAsHtml || '',
        textBody: parsed.text || '',
        snippet: (parsed.text || '').substring(0, 200),
        attachments,
        headers: Object.fromEntries(parsed.headers),
        labels: [folder.toLowerCase()],
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get attachment data
   */
  async getAttachment(folder, uid, attachmentId) {
    const client = await this.connect();
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      const message = await client.fetchOne(uid, {
        source: true,
      });
      
      const parsed = await simpleParser(message.source);
      const attachment = parsed.attachments.find(
        att => att.contentId === attachmentId || att.checksum === attachmentId
      );
      
      if (!attachment) {
        throw new Error('Attachment not found');
      }
      
      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        content: attachment.content,
        size: attachment.size,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Mark email as read/unread
   */
  async setReadStatus(folder, uid, read) {
    const client = await this.connect();
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      if (read) {
        await client.messageFlagsAdd(uid, ['\\Seen']);
      } else {
        await client.messageFlagsRemove(uid, ['\\Seen']);
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Toggle star/flag on email
   */
  async setStarred(folder, uid, starred) {
    const client = await this.connect();
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      if (starred) {
        await client.messageFlagsAdd(uid, ['\\Flagged']);
      } else {
        await client.messageFlagsRemove(uid, ['\\Flagged']);
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Move email to another folder
   */
  async moveEmail(sourceFolder, uid, targetFolder) {
    const client = await this.connect();
    
    try {
      const resolvedSource = await this.resolveFolderPath(sourceFolder, client);
      const resolvedTarget = await this.resolveFolderPath(targetFolder, client);
      await client.mailboxOpen(resolvedSource);
      await client.messageMove(uid, resolvedTarget);
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Copy email to another folder
   */
  async copyEmail(sourceFolder, uid, targetFolder) {
    const client = await this.connect();
    
    try {
      const resolvedSource = await this.resolveFolderPath(sourceFolder, client);
      const resolvedTarget = await this.resolveFolderPath(targetFolder, client);
      await client.mailboxOpen(resolvedSource);
      await client.messageCopy(uid, resolvedTarget);
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Delete email (move to trash or permanently delete)
   */
  async deleteEmail(folder, uid, permanent = false) {
    const client = await this.connect();
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      // Check if already in trash
      const isInTrash = resolvedFolder.toLowerCase().includes('trash') || 
                        resolvedFolder.toLowerCase().includes('deleted');
      
      if (permanent || isInTrash) {
        await client.messageDelete(uid);
      } else {
        // Find trash folder using specialUse flag
        const mailboxes = await client.list();
        const trashBox = mailboxes.find(box => box.specialUse === '\\Trash');
        
        if (trashBox) {
          await client.messageMove(uid, trashBox.path);
        } else {
          // No trash folder found, permanently delete
          await client.messageDelete(uid);
        }
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Search emails
   */
  async searchEmails(query, options = {}) {
    const client = await this.connect();
    const { folder = 'INBOX', limit = 50 } = options;
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      await client.mailboxOpen(resolvedFolder);
      
      const searchResults = await client.search({
        or: [
          { subject: query },
          { from: query },
          { to: query },
          { body: query },
        ],
      });
      
      const messages = [];
      const uidsToFetch = searchResults.slice(0, limit);
      
      if (uidsToFetch.length === 0) {
        return { emails: [], total: 0, query };
      }
      
      for await (const message of client.fetch(uidsToFetch, {
        uid: true,
        envelope: true,
        flags: true,
      })) {
        messages.push({
          uid: message.uid,
          id: `${folder}-${message.uid}`,
          from: message.envelope?.from?.[0] ? {
            name: message.envelope.from[0].name || '',
            email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
          } : { name: '', email: '' },
          to: (message.envelope?.to || []).map(addr => ({
            name: addr.name || '',
            email: `${addr.mailbox}@${addr.host}`,
          })),
          subject: message.envelope?.subject || '(no subject)',
          date: message.envelope?.date || new Date(),
          read: message.flags?.has('\\Seen') || false,
          starred: message.flags?.has('\\Flagged') || false,
          labels: [folder.toLowerCase()],
        });
      }
      
      return {
        emails: messages.reverse(),
        total: searchResults.length,
        query,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Create a new mailbox/folder
   */
  async createMailbox(name) {
    const client = await this.connect();
    
    try {
      await client.mailboxCreate(name);
      return { success: true, name };
    } finally {
      await client.logout();
    }
  }

  /**
   * Delete a mailbox/folder
   */
  async deleteMailbox(path) {
    const client = await this.connect();
    
    try {
      await client.mailboxDelete(path);
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Rename a mailbox/folder
   */
  async renameMailbox(oldPath, newPath) {
    const client = await this.connect();
    
    try {
      await client.mailboxRename(oldPath, newPath);
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get mailbox status (message counts)
   */
  async getMailboxStatus(folder) {
    const client = await this.connect();
    
    try {
      const status = await client.status(folder, {
        messages: true,
        recent: true,
        unseen: true,
        uidNext: true,
        uidValidity: true,
      });
      
      return {
        folder,
        total: status.messages,
        recent: status.recent,
        unseen: status.unseen,
        uidNext: status.uidNext,
        uidValidity: status.uidValidity,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Check if body structure has attachments
   */
  hasAttachments(bodyStructure) {
    if (!bodyStructure) return false;
    
    const check = (part) => {
      if (part.disposition === 'attachment') return true;
      if (part.childNodes) {
        return part.childNodes.some(check);
      }
      return false;
    };
    
    return check(bodyStructure);
  }

  /**
   * Append/save a message to a folder (for drafts, sent items)
   */
  async appendMessage(folder, rawMessage, flags = []) {
    const client = await this.connect();
    
    try {
      const result = await client.append(folder, rawMessage, flags);
      return { success: true, uid: result.uid };
    } finally {
      await client.logout();
    }
  }

  /**
   * Set important flag on email
   */
  async setImportant(folder, uid, important) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      
      // Some servers use $Important, others use \Important
      const flags = ['$Important'];
      
      if (important) {
        await client.messageFlagsAdd(uid, flags);
      } else {
        await client.messageFlagsRemove(uid, flags);
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Add custom label/keyword to email
   */
  async addLabel(folder, uid, label) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      await client.messageFlagsAdd(uid, [label]);
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Remove custom label/keyword from email
   */
  async removeLabel(folder, uid, label) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      await client.messageFlagsRemove(uid, [label]);
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Archive email (move to Archive folder)
   */
  async archiveEmail(folder, uid) {
    const client = await this.connect();
    
    try {
      const mailboxes = await client.list();
      const archiveBox = mailboxes.find(
        box => box.specialUse === '\\Archive' || 
        ['Archive', 'All Mail', 'All'].some(n => box.name.toLowerCase() === n.toLowerCase())
      );
      
      if (!archiveBox) {
        // Create Archive folder if it doesn't exist
        await client.mailboxCreate('Archive');
        await client.mailboxOpen(folder);
        await client.messageMove(uid, 'Archive');
      } else {
        await client.mailboxOpen(folder);
        await client.messageMove(uid, archiveBox.path);
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Mark email as spam (move to Spam/Junk folder)
   */
  async markAsSpam(folder, uid) {
    const client = await this.connect();
    
    try {
      const mailboxes = await client.list();
      const spamBox = mailboxes.find(
        box => box.specialUse === '\\Junk' || 
        ['Spam', 'Junk', 'Junk E-mail'].some(n => box.name.toLowerCase() === n.toLowerCase())
      );
      
      if (!spamBox) {
        // Create Spam folder if it doesn't exist
        await client.mailboxCreate('Spam');
        await client.mailboxOpen(folder);
        await client.messageMove(uid, 'Spam');
      } else {
        await client.mailboxOpen(folder);
        await client.messageMove(uid, spamBox.path);
      }
      
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Mark email as not spam (move back to INBOX)
   */
  async markAsNotSpam(folder, uid) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      await client.messageMove(uid, 'INBOX');
      return { success: true };
    } finally {
      await client.logout();
    }
  }

  /**
   * Empty a folder (permanently delete all messages)
   */
  async emptyFolder(folder) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      
      // Search for all messages
      const messages = await client.search({ all: true });
      
      if (messages.length > 0) {
        // Mark all as deleted and expunge
        await client.messageDelete(messages);
      }
      
      return { success: true, deleted: messages.length };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get new messages since a specific UID
   */
  async getNewMessages(folder, sinceUid) {
    const client = await this.connect();
    
    try {
      const resolvedFolder = await this.resolveFolderPath(folder, client);
      const mailbox = await client.mailboxOpen(resolvedFolder);
      
      // Check if mailbox is empty or if there are no new messages
      if (!mailbox.exists || mailbox.exists === 0 || mailbox.uidNext <= sinceUid + 1) {
        return {
          emails: [],
          total: 0,
          folder: resolvedFolder,
        };
      }
      
      // Search for messages with UID greater than sinceUid
      const messages = [];
      
      try {
        for await (const message of client.fetch(
          { uid: `${sinceUid + 1}:*` },
          {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            size: true,
          }
        )) {
          messages.push({
            uid: message.uid,
            id: `${resolvedFolder}-${message.uid}`,
            messageId: message.envelope?.messageId,
            from: message.envelope?.from?.[0] ? {
              name: message.envelope.from[0].name || '',
              email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
            } : { name: '', email: '' },
            to: (message.envelope?.to || []).map(addr => ({
              name: addr.name || '',
              email: `${addr.mailbox}@${addr.host}`,
            })),
            subject: message.envelope?.subject || '(no subject)',
            date: message.envelope?.date || new Date(),
            read: message.flags?.has('\\Seen') || false,
            starred: message.flags?.has('\\Flagged') || false,
            hasAttachments: this.hasAttachments(message.bodyStructure),
            labels: [resolvedFolder.toLowerCase()],
          });
        }
      } catch (fetchError) {
        // Handle empty result set or invalid UID range gracefully
        if (fetchError.responseText?.includes('Invalid messageset')) {
          return {
            emails: [],
            total: 0,
            folder,
          };
        }
        throw fetchError;
      }
      
      return {
        emails: messages.reverse(),
        total: messages.length,
        folder,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Check for new messages (polling) - returns count and UIDs
   */
  async checkNewMessages(folder, knownUidNext) {
    const client = await this.connect();
    
    try {
      const status = await client.status(folder, {
        messages: true,
        recent: true,
        unseen: true,
        uidNext: true,
      });
      
      const hasNew = status.uidNext > knownUidNext;
      
      return {
        folder,
        total: status.messages,
        recent: status.recent,
        unseen: status.unseen,
        uidNext: status.uidNext,
        hasNew,
        newCount: hasNew ? status.uidNext - knownUidNext : 0,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get all starred/flagged emails across specified folders
   */
  async getStarredEmails(folders = ['INBOX'], limit = 100) {
    const client = await this.connect();
    const allStarred = [];
    
    try {
      for (const folder of folders) {
        try {
          await client.mailboxOpen(folder);
          
          const starredUids = await client.search({ flagged: true });
          
          if (starredUids.length > 0) {
            for await (const message of client.fetch(
              starredUids.slice(0, Math.min(starredUids.length, limit - allStarred.length)),
              {
                uid: true,
                envelope: true,
                flags: true,
              }
            )) {
              allStarred.push({
                uid: message.uid,
                id: `${folder}-${message.uid}`,
                folder,
                from: message.envelope?.from?.[0] ? {
                  name: message.envelope.from[0].name || '',
                  email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
                } : { name: '', email: '' },
                subject: message.envelope?.subject || '(no subject)',
                date: message.envelope?.date || new Date(),
                read: message.flags?.has('\\Seen') || false,
                starred: true,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to get starred from ${folder}:`, error.message);
        }
        
        if (allStarred.length >= limit) break;
      }
      
      // Sort by date descending
      allStarred.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        emails: allStarred.slice(0, limit),
        total: allStarred.length,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get conversation thread (emails with same subject or in-reply-to chain)
   */
  async getThread(folder, uid) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      
      // First, get the target message
      const targetMsg = await client.fetchOne(uid, {
        uid: true,
        envelope: true,
        source: true,
      });
      
      if (!targetMsg) {
        throw new Error('Email not found');
      }
      
      const parsed = await simpleParser(targetMsg.source);
      const subject = targetMsg.envelope?.subject || '';
      const messageId = targetMsg.envelope?.messageId;
      const references = parsed.references || [];
      const inReplyTo = parsed.inReplyTo;
      
      // Collect all related message IDs
      const relatedIds = new Set([messageId, inReplyTo, ...references].filter(Boolean));
      
      // Search for related messages by subject (strip Re:/Fwd:)
      const baseSubject = subject.replace(/^(Re|Fwd|Fw):\s*/gi, '').trim();
      
      let threadUids = [];
      if (baseSubject) {
        threadUids = await client.search({ subject: baseSubject });
      }
      
      // Fetch all thread messages
      const threadMessages = [];
      
      if (threadUids.length > 0) {
        for await (const message of client.fetch(threadUids, {
          uid: true,
          envelope: true,
          flags: true,
          source: true,
        })) {
          const msgParsed = await simpleParser(message.source);
          
          threadMessages.push({
            uid: message.uid,
            id: `${folder}-${message.uid}`,
            messageId: message.envelope?.messageId,
            inReplyTo: msgParsed.inReplyTo,
            references: msgParsed.references,
            from: message.envelope?.from?.[0] ? {
              name: message.envelope.from[0].name || '',
              email: `${message.envelope.from[0].mailbox}@${message.envelope.from[0].host}`,
            } : { name: '', email: '' },
            to: (message.envelope?.to || []).map(addr => ({
              name: addr.name || '',
              email: `${addr.mailbox}@${addr.host}`,
            })),
            subject: message.envelope?.subject || '(no subject)',
            date: message.envelope?.date || new Date(),
            read: message.flags?.has('\\Seen') || false,
            starred: message.flags?.has('\\Flagged') || false,
            body: msgParsed.html || msgParsed.textAsHtml || '',
            textBody: msgParsed.text || '',
          });
        }
      }
      
      // Sort by date ascending for thread view
      threadMessages.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return {
        thread: threadMessages,
        count: threadMessages.length,
        subject: baseSubject,
      };
    } finally {
      await client.logout();
    }
  }

  /**
   * Update a draft message (delete old, append new)
   */
  async updateDraft(folder, oldUid, rawMessage) {
    const client = await this.connect();
    
    try {
      // Append new draft first
      const result = await client.append(folder, rawMessage, ['\\Draft']);
      
      // Then delete the old one
      await client.mailboxOpen(folder);
      await client.messageDelete(oldUid);
      
      return { success: true, uid: result.uid };
    } finally {
      await client.logout();
    }
  }

  /**
   * Get unread count for multiple folders
   */
  async getUnreadCounts(folders) {
    const client = await this.connect();
    const counts = {};
    
    try {
      for (const folder of folders) {
        try {
          const status = await client.status(folder, { unseen: true, messages: true });
          counts[folder] = {
            unseen: status.unseen,
            total: status.messages,
          };
        } catch (error) {
          counts[folder] = { unseen: 0, total: 0, error: error.message };
        }
      }
      
      return counts;
    } finally {
      await client.logout();
    }
  }

  /**
   * Batch set flags on multiple messages
   */
  async batchSetFlags(folder, uids, flags, add = true) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      
      if (add) {
        await client.messageFlagsAdd(uids, flags);
      } else {
        await client.messageFlagsRemove(uids, flags);
      }
      
      return { success: true, affected: uids.length };
    } finally {
      await client.logout();
    }
  }

  /**
   * Expunge deleted messages from a folder
   */
  async expunge(folder) {
    const client = await this.connect();
    
    try {
      await client.mailboxOpen(folder);
      await client.messageDelete({ deleted: true });
      return { success: true };
    } finally {
      await client.logout();
    }
  }
}

/**
 * Create an IMAP service instance from user credentials
 */
export function createImapService(credentials) {
  return new ImapService({
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    pass: credentials.pass,
    secure: credentials.secure,
  });
}
