import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createImapService } from '../services/imap.js';

const router = Router();

// All folder routes require authentication
router.use(authenticate);

/**
 * GET /api/folders
 * Get all mailbox folders
 */
router.get('/', async (req, res, next) => {
  try {
    const imapService = createImapService(req.user.imap);
    const mailboxes = await imapService.getMailboxes();
    
    // Map to a more usable format
    const folders = mailboxes.map(box => ({
      name: box.name,
      path: box.path,
      type: getFolderType(box),
      delimiter: box.delimiter,
      flags: box.flags,
      subscribed: box.subscribed,
    }));
    
    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/folders/:path/status
 * Get folder status (message counts)
 */
router.get('/:path/status', async (req, res, next) => {
  try {
    const { path } = req.params;
    const decodedPath = decodeURIComponent(path);
    
    const imapService = createImapService(req.user.imap);
    const status = await imapService.getMailboxStatus(decodedPath);
    
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/folders
 * Create a new folder
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, parent } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Folder name is required',
      });
    }
    
    const folderPath = parent ? `${parent}/${name}` : name;
    
    const imapService = createImapService(req.user.imap);
    await imapService.createMailbox(folderPath);
    
    res.json({
      success: true,
      folder: {
        name,
        path: folderPath,
        type: 'custom',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/folders/:path
 * Rename a folder
 */
router.patch('/:path', async (req, res, next) => {
  try {
    const { path } = req.params;
    const { newName } = req.body;
    
    if (!newName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New folder name is required',
      });
    }
    
    const decodedPath = decodeURIComponent(path);
    const pathParts = decodedPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    
    const imapService = createImapService(req.user.imap);
    await imapService.renameMailbox(decodedPath, newPath);
    
    res.json({
      success: true,
      folder: {
        name: newName,
        path: newPath,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/folders/:path
 * Delete a folder
 */
router.delete('/:path', async (req, res, next) => {
  try {
    const { path } = req.params;
    const decodedPath = decodeURIComponent(path);
    
    // Prevent deleting system folders
    const systemFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Junk'];
    if (systemFolders.some(f => f.toLowerCase() === decodedPath.toLowerCase())) {
      return res.status(400).json({
        error: 'Cannot Delete',
        message: 'System folders cannot be deleted',
      });
    }
    
    const imapService = createImapService(req.user.imap);
    await imapService.deleteMailbox(decodedPath);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/folders/:path/empty
 * Empty a folder (permanently delete all messages)
 */
router.post('/:path/empty', async (req, res, next) => {
  try {
    const { path } = req.params;
    const decodedPath = decodeURIComponent(path);
    
    // Only allow emptying Trash and Spam folders for safety
    const allowedFolders = ['trash', 'deleted', 'deleted items', 'spam', 'junk', 'junk e-mail'];
    
    const imapService = createImapService(req.user.imap);
    
    // Get mailbox info to check if it's a trash/spam folder
    const mailboxes = await imapService.getMailboxes();
    const targetBox = mailboxes.find(box => box.path === decodedPath);
    
    const isAllowed = targetBox && (
      targetBox.specialUse === '\\Trash' ||
      targetBox.specialUse === '\\Junk' ||
      allowedFolders.includes(targetBox.name.toLowerCase())
    );
    
    if (!isAllowed) {
      return res.status(400).json({
        error: 'Cannot Empty',
        message: 'Only Trash and Spam folders can be emptied',
      });
    }
    
    const result = await imapService.emptyFolder(decodedPath);
    
    res.json({
      success: true,
      deleted: result.deleted,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/folders/all-status
 * Get status for all folders (unread counts, totals)
 */
router.get('/all-status', async (req, res, next) => {
  try {
    const imapService = createImapService(req.user.imap);
    
    const mailboxes = await imapService.getMailboxes();
    const folderPaths = mailboxes.map(m => m.path);
    
    const counts = await imapService.getUnreadCounts(folderPaths);
    
    // Combine with folder info
    const foldersWithStatus = mailboxes.map(box => ({
      name: box.name,
      path: box.path,
      type: getFolderType(box),
      ...counts[box.path],
    }));
    
    res.json({ folders: foldersWithStatus });
  } catch (error) {
    next(error);
  }
});

/**
 * Determine folder type from mailbox info
 */
function getFolderType(mailbox) {
  const { name, specialUse } = mailbox;
  const nameLower = name.toLowerCase();
  
  // Check special use flag first
  if (specialUse) {
    const useMap = {
      '\\Inbox': 'inbox',
      '\\Sent': 'sent',
      '\\Drafts': 'drafts',
      '\\Trash': 'trash',
      '\\Junk': 'spam',
      '\\Flagged': 'starred',
      '\\All': 'all',
      '\\Archive': 'archive',
    };
    
    if (useMap[specialUse]) {
      return useMap[specialUse];
    }
  }
  
  // Fallback to name-based detection
  const nameMap = {
    inbox: 'inbox',
    sent: 'sent',
    'sent items': 'sent',
    'sent messages': 'sent',
    drafts: 'drafts',
    draft: 'drafts',
    trash: 'trash',
    deleted: 'trash',
    'deleted items': 'trash',
    'deleted messages': 'trash',
    spam: 'spam',
    junk: 'spam',
    'junk e-mail': 'spam',
    starred: 'starred',
    flagged: 'starred',
    important: 'important',
    archive: 'archive',
    all: 'all',
    'all mail': 'all',
  };
  
  return nameMap[nameLower] || 'custom';
}

export default router;
