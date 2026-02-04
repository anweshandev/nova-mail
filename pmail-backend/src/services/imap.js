import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

/**
 * IMAP Service - Handles all IMAP operations for email fetching
 */
export class ImapService {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 993,
      secure: config.secure !== false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      logger: false,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
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
   * Get emails from a specific folder
   */
  async getEmails(folder = 'INBOX', options = {}) {
    const client = await this.connect();
    const { limit = 50, offset = 0, search } = options;
    
    try {
      await client.mailboxOpen(folder);
      
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
      await client.mailboxOpen(folder);
      
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
      await client.mailboxOpen(folder);
      
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
      await client.mailboxOpen(folder);
      
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
      await client.mailboxOpen(folder);
      
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
      await client.mailboxOpen(sourceFolder);
      await client.messageMove(uid, targetFolder);
      
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
      await client.mailboxOpen(sourceFolder);
      await client.messageCopy(uid, targetFolder);
      
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
      await client.mailboxOpen(folder);
      
      if (permanent || folder.toLowerCase() === 'trash') {
        await client.messageDelete(uid);
      } else {
        // Try common trash folder names
        const trashFolders = ['Trash', 'Deleted', 'Deleted Items', 'Deleted Messages'];
        const mailboxes = await client.list();
        const trashBox = mailboxes.find(
          box => box.specialUse === '\\Trash' || trashFolders.includes(box.name)
        );
        
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
      await client.mailboxOpen(folder);
      
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
