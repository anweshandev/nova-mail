import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createImapService } from '../services/imap.js';
import { createSmtpService } from '../services/smtp.js';
import { z } from 'zod';
import multer from 'multer';

const router = Router();

// Configure multer for attachment uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 10, // Max 10 attachments
  },
});

// All email routes require authentication
router.use(authenticate);

// Validation schemas
const sendEmailSchema = z.object({
  to: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).min(1, 'At least one recipient is required'),
  cc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).optional().default([]),
  bcc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).optional().default([]),
  subject: z.string().optional().default('(no subject)'),
  body: z.string().optional().default(''),
  textBody: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // Base64 encoded
    contentType: z.string().optional(),
  })).optional().default([]),
  scheduledAt: z.string().datetime().optional(),
});

const draftSchema = z.object({
  to: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).optional().default([]),
  cc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).optional().default([]),
  bcc: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional().default(''),
  })).optional().default([]),
  subject: z.string().optional().default(''),
  body: z.string().optional().default(''),
});

/**
 * GET /api/emails
 * Get emails from a folder
 */
router.get('/', async (req, res, next) => {
  try {
    const { folder = 'INBOX', limit = 50, offset = 0, search } = req.query;
    
    const imapService = createImapService(req.user.imap);
    const result = await imapService.getEmails(folder, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      search,
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/search
 * Search emails across folders
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, folder = 'INBOX', limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    const result = await imapService.searchEmails(q, {
      folder,
      limit: parseInt(limit),
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/:folder/:uid
 * Get a single email with full content
 */
router.get('/:folder/:uid', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { markAsRead = 'true' } = req.query;
    
    const imapService = createImapService(req.user.imap);
    const email = await imapService.getEmail(folder, parseInt(uid));
    
    // Mark as read if requested
    if (markAsRead === 'true' && !email.read) {
      await imapService.setReadStatus(folder, parseInt(uid), true);
      email.read = true;
    }
    
    res.json(email);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/:folder/:uid/attachment/:attachmentId
 * Download an attachment
 */
router.get('/:folder/:uid/attachment/:attachmentId', async (req, res, next) => {
  try {
    const { folder, uid, attachmentId } = req.params;
    
    const imapService = createImapService(req.user.imap);
    const attachment = await imapService.getAttachment(
      folder,
      parseInt(uid),
      attachmentId
    );
    
    res.setHeader('Content-Type', attachment.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Length', attachment.size);
    res.send(attachment.content);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/send
 * Send a new email
 */
router.post('/send', upload.array('files'), async (req, res, next) => {
  try {
    // Parse JSON body if sent as form data
    let emailData = req.body;
    if (typeof req.body.data === 'string') {
      emailData = JSON.parse(req.body.data);
    }
    
    // Add uploaded files as attachments
    if (req.files && req.files.length > 0) {
      emailData.attachments = emailData.attachments || [];
      req.files.forEach(file => {
        emailData.attachments.push({
          filename: file.originalname,
          content: file.buffer.toString('base64'),
          contentType: file.mimetype,
        });
      });
    }
    
    const validation = sendEmailSchema.safeParse(emailData);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }
    
    const smtpService = createSmtpService({
      ...req.user.smtp,
      name: req.user.name,
    });
    
    const result = await smtpService.sendEmail(validation.data);
    
    // Save to Sent folder
    try {
      const imapService = createImapService(req.user.imap);
      const mailboxes = await imapService.getMailboxes();
      const sentFolder = mailboxes.find(
        box => box.specialUse === '\\Sent' || 
        ['Sent', 'Sent Items', 'Sent Messages'].includes(box.name)
      );
      
      if (sentFolder) {
        const rawMessage = smtpService.buildDraftMessage(validation.data);
        await imapService.appendMessage(sentFolder.path, rawMessage, ['\\Seen']);
      }
    } catch (error) {
      console.warn('Failed to save to Sent folder:', error.message);
    }
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/reply
 * Reply to an email
 */
router.post('/:folder/:uid/reply', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { body, replyAll = false, attachments = [] } = req.body;
    
    const imapService = createImapService(req.user.imap);
    const smtpService = createSmtpService({
      ...req.user.smtp,
      name: req.user.name,
    });
    
    // Get original email
    const originalEmail = await imapService.getEmail(folder, parseInt(uid));
    
    // Send reply
    const result = await smtpService.sendReply(originalEmail, {
      body,
      replyAll,
      attachments,
    });
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/forward
 * Forward an email
 */
router.post('/:folder/:uid/forward', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { to, cc, bcc, body, attachments = [] } = req.body;
    
    if (!to || to.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one recipient is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    const smtpService = createSmtpService({
      ...req.user.smtp,
      name: req.user.name,
    });
    
    // Get original email
    const originalEmail = await imapService.getEmail(folder, parseInt(uid));
    
    // Forward email
    const result = await smtpService.forwardEmail(originalEmail, {
      to,
      cc,
      bcc,
      body,
      attachments,
    });
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/draft
 * Save email as draft
 */
router.post('/draft', async (req, res, next) => {
  try {
    const validation = draftSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }
    
    const imapService = createImapService(req.user.imap);
    const smtpService = createSmtpService({
      ...req.user.smtp,
      name: req.user.name,
    });
    
    // Find Drafts folder
    const mailboxes = await imapService.getMailboxes();
    const draftsFolder = mailboxes.find(
      box => box.specialUse === '\\Drafts' || 
      ['Drafts', 'Draft'].includes(box.name)
    );
    
    if (!draftsFolder) {
      return res.status(400).json({
        error: 'Drafts folder not found',
        message: 'Unable to find Drafts folder on mail server',
      });
    }
    
    // Build and save draft
    const rawMessage = smtpService.buildDraftMessage(validation.data);
    const result = await imapService.appendMessage(
      draftsFolder.path,
      rawMessage,
      ['\\Draft']
    );
    
    res.json({
      success: true,
      uid: result.uid,
      folder: draftsFolder.path,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/emails/:folder/:uid/read
 * Mark email as read/unread
 */
router.patch('/:folder/:uid/read', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { read } = req.body;
    
    if (typeof read !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'read must be a boolean',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.setReadStatus(folder, parseInt(uid), read);
    
    res.json({ success: true, read });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/emails/:folder/:uid/star
 * Toggle star on email
 */
router.patch('/:folder/:uid/star', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { starred } = req.body;
    
    if (typeof starred !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'starred must be a boolean',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.setStarred(folder, parseInt(uid), starred);
    
    res.json({ success: true, starred });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/move
 * Move email to another folder
 */
router.post('/:folder/:uid/move', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { targetFolder } = req.body;
    
    if (!targetFolder) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'targetFolder is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.moveEmail(folder, parseInt(uid), targetFolder);
    
    res.json({ success: true, targetFolder });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/copy
 * Copy email to another folder
 */
router.post('/:folder/:uid/copy', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { targetFolder } = req.body;
    
    if (!targetFolder) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'targetFolder is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.copyEmail(folder, parseInt(uid), targetFolder);
    
    res.json({ success: true, targetFolder });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/emails/:folder/:uid
 * Delete an email (move to trash or permanent)
 */
router.delete('/:folder/:uid', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { permanent = false } = req.query;
    
    const imapService = createImapService(req.user.imap);
    await imapService.deleteEmail(folder, parseInt(uid), permanent === 'true');
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/read
 * Mark multiple emails as read/unread
 */
router.post('/batch/read', async (req, res, next) => {
  try {
    const { emails, read } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    if (typeof read !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'read must be a boolean',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.setReadStatus(folder, parseInt(uid), read)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/delete
 * Delete multiple emails
 */
router.post('/batch/delete', async (req, res, next) => {
  try {
    const { emails, permanent = false } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.deleteEmail(folder, parseInt(uid), permanent)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/move
 * Move multiple emails to a folder
 */
router.post('/batch/move', async (req, res, next) => {
  try {
    const { emails, targetFolder } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    if (!targetFolder) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'targetFolder is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.moveEmail(folder, parseInt(uid), targetFolder)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed, targetFolder });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/star
 * Toggle star on multiple emails
 */
router.post('/batch/star', async (req, res, next) => {
  try {
    const { emails, starred } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    if (typeof starred !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'starred must be a boolean',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.setStarred(folder, parseInt(uid), starred)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed, starred });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/emails/:folder/:uid/important
 * Mark email as important/not important
 */
router.patch('/:folder/:uid/important', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { important } = req.body;
    
    if (typeof important !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'important must be a boolean',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.setImportant(folder, parseInt(uid), important);
    
    res.json({ success: true, important });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/archive
 * Archive an email
 */
router.post('/:folder/:uid/archive', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    
    const imapService = createImapService(req.user.imap);
    await imapService.archiveEmail(folder, parseInt(uid));
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/spam
 * Mark email as spam
 */
router.post('/:folder/:uid/spam', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    
    const imapService = createImapService(req.user.imap);
    await imapService.markAsSpam(folder, parseInt(uid));
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/not-spam
 * Mark email as not spam (move back to INBOX)
 */
router.post('/:folder/:uid/not-spam', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    
    const imapService = createImapService(req.user.imap);
    await imapService.markAsNotSpam(folder, parseInt(uid));
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/archive
 * Archive multiple emails
 */
router.post('/batch/archive', async (req, res, next) => {
  try {
    const { emails } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.archiveEmail(folder, parseInt(uid))
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/batch/spam
 * Mark multiple emails as spam
 */
router.post('/batch/spam', async (req, res, next) => {
  try {
    const { emails } = req.body;
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'emails must be a non-empty array',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    
    const results = await Promise.allSettled(
      emails.map(({ folder, uid }) =>
        imapService.markAsSpam(folder, parseInt(uid))
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({ success: true, succeeded, failed });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/starred
 * Get all starred emails across folders
 */
router.get('/starred', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    const imapService = createImapService(req.user.imap);
    
    // Get all mailboxes
    const mailboxes = await imapService.getMailboxes();
    const folderPaths = mailboxes.map(m => m.path);
    
    const result = await imapService.getStarredEmails(folderPaths, parseInt(limit));
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/:folder/:uid/thread
 * Get conversation thread for an email
 */
router.get('/:folder/:uid/thread', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    
    const imapService = createImapService(req.user.imap);
    const thread = await imapService.getThread(folder, parseInt(uid));
    
    res.json(thread);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/emails/draft/:folder/:uid
 * Update an existing draft
 */
router.put('/draft/:folder/:uid', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const validation = draftSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }
    
    const imapService = createImapService(req.user.imap);
    const smtpService = createSmtpService({
      ...req.user.smtp,
      name: req.user.name,
    });
    
    // Build new draft message
    const rawMessage = smtpService.buildDraftMessage(validation.data);
    const result = await imapService.updateDraft(folder, parseInt(uid), rawMessage);
    
    res.json({
      success: true,
      uid: result.uid,
      folder,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/emails/draft/:folder/:uid
 * Delete a draft (permanently)
 */
router.delete('/draft/:folder/:uid', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    
    const imapService = createImapService(req.user.imap);
    await imapService.deleteEmail(folder, parseInt(uid), true);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/sync
 * Check for new emails (polling endpoint)
 */
router.get('/sync', async (req, res, next) => {
  try {
    const { folder = 'INBOX', uidNext } = req.query;
    
    const imapService = createImapService(req.user.imap);
    
    if (uidNext) {
      // Check if there are new messages since uidNext
      const status = await imapService.checkNewMessages(folder, parseInt(uidNext));
      
      if (status.hasNew) {
        // Fetch the new messages
        const newEmails = await imapService.getNewMessages(folder, parseInt(uidNext));
        res.json({
          ...status,
          newEmails: newEmails.emails,
        });
      } else {
        res.json(status);
      }
    } else {
      // Just return current status
      const status = await imapService.getMailboxStatus(folder);
      res.json(status);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/unread-counts
 * Get unread counts for all folders
 */
router.get('/unread-counts', async (req, res, next) => {
  try {
    const imapService = createImapService(req.user.imap);
    
    // Get all mailboxes
    const mailboxes = await imapService.getMailboxes();
    const folderPaths = mailboxes.map(m => m.path);
    
    const counts = await imapService.getUnreadCounts(folderPaths);
    
    res.json({ counts });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emails/:folder/:uid/label
 * Add a label/keyword to an email
 */
router.post('/:folder/:uid/label', async (req, res, next) => {
  try {
    const { folder, uid } = req.params;
    const { label } = req.body;
    
    if (!label) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'label is required',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.addLabel(folder, parseInt(uid), label);
    
    res.json({ success: true, label });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/emails/:folder/:uid/label/:label
 * Remove a label/keyword from an email
 */
router.delete('/:folder/:uid/label/:label', async (req, res, next) => {
  try {
    const { folder, uid, label } = req.params;
    
    const imapService = createImapService(req.user.imap);
    await imapService.removeLabel(folder, parseInt(uid), label);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
