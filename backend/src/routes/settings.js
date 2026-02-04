import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

/**
 * GET /api/settings
 * Get user settings
 */
router.get('/', async (req, res) => {
  // Settings are typically stored client-side or in a database
  // For now, return default settings
  res.json({
    settings: {
      displayDensity: 'default',
      theme: 'system',
      conversationView: true,
      previewPane: 'right',
      autoAdvance: true,
      desktopNotifications: false,
      signature: '',
      sendCancellation: 5,
    },
  });
});

/**
 * PATCH /api/settings
 * Update user settings
 */
router.patch('/', async (req, res) => {
  // In a real implementation, you'd save these to a database
  // For now, just acknowledge the update
  const { settings } = req.body;
  
  res.json({
    success: true,
    settings,
  });
});

/**
 * GET /api/settings/signature
 * Get email signature
 */
router.get('/signature', async (req, res) => {
  res.json({
    signature: '',
    useSignature: false,
  });
});

/**
 * PUT /api/settings/signature
 * Update email signature
 */
router.put('/signature', async (req, res) => {
  const { signature, useSignature } = req.body;
  
  res.json({
    success: true,
    signature,
    useSignature,
  });
});

/**
 * GET /api/settings/filters
 * Get email filters/rules
 */
router.get('/filters', async (req, res) => {
  // Email filters would be stored in a database
  res.json({
    filters: [],
  });
});

/**
 * POST /api/settings/filters
 * Create a new email filter
 */
router.post('/filters', async (req, res) => {
  const { filter } = req.body;
  
  res.json({
    success: true,
    filter: {
      id: Date.now().toString(),
      ...filter,
    },
  });
});

/**
 * DELETE /api/settings/filters/:id
 * Delete an email filter
 */
router.delete('/filters/:id', async (req, res) => {
  res.json({ success: true });
});

/**
 * GET /api/settings/labels
 * Get custom labels
 */
router.get('/labels', async (req, res) => {
  res.json({
    labels: [
      { id: 'work', name: 'Work', color: '#1a73e8' },
      { id: 'personal', name: 'Personal', color: '#34a853' },
      { id: 'important-label', name: 'Important', color: '#ea4335' },
      { id: 'finance', name: 'Finance', color: '#9334e9' },
      { id: 'travel', name: 'Travel', color: '#ff6d01' },
    ],
  });
});

/**
 * POST /api/settings/labels
 * Create a new label
 */
router.post('/labels', async (req, res) => {
  const { name, color } = req.body;
  
  res.json({
    success: true,
    label: {
      id: Date.now().toString(),
      name,
      color,
    },
  });
});

/**
 * PATCH /api/settings/labels/:id
 * Update a label
 */
router.patch('/labels/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  
  res.json({
    success: true,
    label: { id, name, color },
  });
});

/**
 * DELETE /api/settings/labels/:id
 * Delete a label
 */
router.delete('/labels/:id', async (req, res) => {
  res.json({ success: true });
});

export default router;
