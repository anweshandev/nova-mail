import { create } from 'zustand';
import Fuse from 'fuse.js';
import { emailsApi, foldersApi, settingsApi } from '../services/api';

// Default labels with colors
const defaultLabels = [
  { id: 'work', name: 'Work', color: '#1a73e8' },
  { id: 'personal', name: 'Personal', color: '#34a853' },
  { id: 'important-label', name: 'Important', color: '#ea4335' },
  { id: 'finance', name: 'Finance', color: '#9334e9' },
  { id: 'travel', name: 'Travel', color: '#ff6d01' },
];

// Mock emails data for development
const mockEmails = [
  {
    id: '1',
    from: { name: 'GitHub', email: 'noreply@github.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: '[novamail/novamail-frontend] Pull request #42: Add email threading support',
    body: `<p>Hey there!</p>
    <p>A new pull request has been opened by <strong>@developer</strong> in the repository.</p>
    <p>This PR adds support for email threading, making it easier to follow conversations.</p>
    <p>View it on GitHub: <a href="#">PR #42</a></p>`,
    snippet: 'A new pull request has been opened by @developer in the repository...',
    date: new Date('2026-02-03T10:30:00'),
    read: false,
    starred: true,
    important: true,
    labels: ['inbox', 'work'],
    attachments: [],
    category: 'updates',
  },
  {
    id: '2',
    from: { name: 'Vercel', email: 'notifications@vercel.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: 'Your deployment is ready!',
    body: `<p>Hi there,</p>
    <p>Your project <strong>novamail-frontend</strong> has been successfully deployed.</p>
    <p>Visit your deployment: <a href="#">https://novamail.vercel.app</a></p>
    <p>Best,<br/>The Vercel Team</p>`,
    snippet: 'Your project novamail-frontend has been successfully deployed...',
    date: new Date('2026-02-03T09:15:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['inbox', 'work'],
    attachments: [],
    category: 'updates',
  },
  {
    id: '3',
    from: { name: 'John Doe', email: 'john.doe@company.com' },
    to: [
      { name: 'You', email: 'user@example.com' },
      { name: 'Sarah Miller', email: 'sarah.m@design.co' },
    ],
    cc: [
      { name: 'Mike Wilson', email: 'mike.w@company.com' },
      { name: 'Amy Chen', email: 'amy.chen@company.com' },
    ],
    subject: 'Meeting tomorrow at 3 PM',
    body: `<p>Hi,</p>
    <p>Just a reminder that we have a meeting scheduled for tomorrow at 3 PM.</p>
    <p>We'll be discussing the Q1 roadmap and upcoming features.</p>
    <p>Let me know if you need to reschedule.</p>
    <p>Best regards,<br/>John</p>`,
    snippet: 'Just a reminder that we have a meeting scheduled for tomorrow at 3 PM...',
    date: new Date('2026-02-02T16:45:00'),
    read: false,
    starred: false,
    important: true,
    labels: ['inbox', 'work'],
    attachments: [
      { id: 'att1', name: 'agenda.pdf', size: 245000, type: 'application/pdf' },
      { id: 'att2', name: 'notes.docx', size: 128000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    ],
    category: 'primary',
  },
  {
    id: '4',
    from: { name: 'AWS', email: 'no-reply@aws.amazon.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: 'Your AWS billing statement is ready',
    body: `<p>Hello,</p>
    <p>Your AWS billing statement for January 2026 is now available.</p>
    <p>Total charges: <strong>$127.43</strong></p>
    <p>View your complete statement in the AWS Console.</p>`,
    snippet: 'Your AWS billing statement for January 2026 is now available...',
    date: new Date('2026-02-01T08:00:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['inbox', 'finance'],
    attachments: [],
    category: 'updates',
  },
  {
    id: '5',
    from: { name: 'Sarah Miller', email: 'sarah.m@design.co' },
    to: [
      { name: 'You', email: 'user@example.com' },
      { name: 'Anweshan Roy', email: 'anweshan@pravaahconsulting.com' },
      { name: 'Nayan Hadke', email: 'nayan@pravaahconsulting.com' },
    ],
    cc: [
      { name: 'Amy Lazarus', email: 'amy.l@delmarintl.ca' },
    ],
    subject: 'Design mockups for review',
    body: `<p>Hey!</p>
    <p>I've attached the latest design mockups for the email client project.</p>
    <p>Please take a look and let me know your thoughts. I'm particularly interested in your feedback on:</p>
    <ul>
      <li>The sidebar navigation</li>
      <li>Email list layout</li>
      <li>Compose modal design</li>
    </ul>
    <p>Thanks!</p>`,
    snippet: "I've attached the latest design mockups for the email client project...",
    date: new Date('2026-01-31T14:20:00'),
    read: true,
    starred: true,
    important: false,
    labels: ['inbox', 'work'],
    attachments: [
      { id: 'att3', name: 'mockups-v2.fig', size: 4500000, type: 'application/figma' },
    ],
    category: 'primary',
  },
  {
    id: '6',
    from: { name: 'Mom', email: 'mom@family.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: 'Happy Birthday next week! 🎂',
    body: `<p>Hi sweetheart,</p>
    <p>Just wanted to remind you that your birthday is coming up next week!</p>
    <p>We're planning a small family dinner. Let me know what day works best for you.</p>
    <p>Love you! ❤️</p>
    <p>Mom</p>`,
    snippet: 'Just wanted to remind you that your birthday is coming up next week...',
    date: new Date('2026-01-30T19:00:00'),
    read: true,
    starred: true,
    important: true,
    labels: ['inbox', 'personal'],
    attachments: [],
    category: 'primary',
  },
  {
    id: '7',
    from: { name: 'You', email: 'user@example.com' },
    to: [{ name: 'Team', email: 'team@company.com' }],
    subject: 'Re: Project update',
    body: `<p>Thanks for the update everyone!</p>
    <p>I'll review the changes and get back to you by EOD.</p>`,
    snippet: "Thanks for the update everyone! I'll review the changes...",
    date: new Date('2026-01-30T11:00:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['sent'],
    attachments: [],
    category: 'primary',
  },
  {
    id: '8',
    from: { name: 'You', email: 'user@example.com' },
    to: [{ name: '', email: '' }],
    subject: 'Draft: Newsletter content',
    body: `<p>Here's the draft for this month's newsletter...</p>`,
    snippet: "Here's the draft for this month's newsletter...",
    date: new Date('2026-02-02T20:00:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['drafts'],
    attachments: [],
    category: 'primary',
  },
  {
    id: '9',
    from: { name: 'LinkedIn', email: 'notifications@linkedin.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: 'You have 5 new connection requests',
    body: `<p>Hi there,</p>
    <p>You have 5 new connection requests waiting for you on LinkedIn.</p>
    <p>View your pending requests now.</p>`,
    snippet: 'You have 5 new connection requests waiting for you on LinkedIn...',
    date: new Date('2026-02-02T12:00:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['inbox'],
    attachments: [],
    category: 'social',
  },
  {
    id: '10',
    from: { name: 'Stripe', email: 'receipts@stripe.com' },
    to: [{ name: 'You', email: 'user@example.com' }],
    subject: 'Receipt for your payment to Netlify',
    body: `<p>Your payment of $19.00 to Netlify was successful.</p>
    <p>Transaction ID: txn_1234567890</p>`,
    snippet: 'Your payment of $19.00 to Netlify was successful...',
    date: new Date('2026-01-28T10:00:00'),
    read: true,
    starred: false,
    important: false,
    labels: ['inbox', 'finance'],
    attachments: [
      { id: 'att4', name: 'receipt.pdf', size: 52000, type: 'application/pdf' },
    ],
    category: 'updates',
  },
];

// Fuse.js search options
const fuseOptions = {
  keys: [
    { name: 'subject', weight: 0.4 },
    { name: 'from.name', weight: 0.2 },
    { name: 'from.email', weight: 0.2 },
    { name: 'body', weight: 0.1 },
    { name: 'snippet', weight: 0.1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

export const useEmailStore = create((set, get) => ({
  // State
  emails: [],
  labels: defaultLabels,
  folders: [],
  selectedEmail: null,
  selectedEmails: [],
  selectedFolder: 'INBOX',
  searchQuery: '',
  isComposeOpen: false,
  composeData: null,
  isLoading: false,
  searchResults: null,
  error: null,
  isApiEnabled: true, // Set to false to use mock data
  syncStatus: null, // { folder, uidNext, lastSync }
  unreadCounts: {}, // { folderPath: { unseen, total } }
  pollingInterval: null, // For auto-refresh

  // Polling / Sync
  startPolling: (intervalMs = 60000) => {
    const { pollingInterval } = get();
    if (pollingInterval) return; // Already polling
    
    const interval = setInterval(() => {
      get().syncEmails();
    }, intervalMs);
    
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  syncEmails: async () => {
    const { isApiEnabled, selectedFolder, syncStatus } = get();
    if (!isApiEnabled) return;
    
    try {
      const uidNext = syncStatus?.folder === selectedFolder ? syncStatus.uidNext : null;
      const result = await emailsApi.sync(selectedFolder, uidNext);
      
      if (result.hasNew && result.newEmails?.length > 0) {
        // Prepend new emails to the list
        set((state) => ({
          emails: [...result.newEmails, ...state.emails],
        }));
      }
      
      set({
        syncStatus: {
          folder: selectedFolder,
          uidNext: result.uidNext,
          lastSync: new Date(),
          unseen: result.unseen,
          total: result.total,
        },
      });
      
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
    }
  },

  refreshEmails: async () => {
    const { selectedFolder, fetchEmails } = get();
    return fetchEmails(selectedFolder);
  },

  fetchUnreadCounts: async () => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return;
    
    try {
      const result = await emailsApi.getUnreadCounts();
      set({ unreadCounts: result.counts });
      return result.counts;
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  },

  // API Actions - Fetch emails from server
  fetchEmails: async (folder = 'INBOX', options = {}) => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return;
    
    set({ isLoading: true, error: null });
    try {
      const result = await emailsApi.list(folder, options);
      set({ 
        emails: result.emails,
        isLoading: false,
      });
      return result;
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchEmail: async (folder, uid) => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return null;
    
    set({ isLoading: true });
    try {
      const email = await emailsApi.get(folder, uid);
      set({ selectedEmail: email, isLoading: false });
      return email;
    } catch (error) {
      console.error('Failed to fetch email:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchFolders: async () => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return;
    
    try {
      const result = await foldersApi.list();
      set({ folders: result.folders });
      return result.folders;
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  },

  // Actions
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  
  setSelectedFolder: (folder) => {
    set({ 
      selectedFolder: folder, 
      selectedEmail: null,
      selectedEmails: [],
    });
    // Fetch emails for the new folder
    get().fetchEmails(folder);
  },
  
  setSearchQuery: async (query) => {
    set({ searchQuery: query });
    if (query.trim()) {
      const { isApiEnabled, emails, selectedFolder } = get();
      
      if (isApiEnabled) {
        try {
          const result = await emailsApi.search(query, selectedFolder);
          set({ searchResults: result.emails });
        } catch (error) {
          // Fallback to local search
          const fuse = new Fuse(emails, fuseOptions);
          const results = fuse.search(query);
          set({ searchResults: results.map(r => r.item) });
        }
      } else {
        const fuse = new Fuse(emails, fuseOptions);
        const results = fuse.search(query);
        set({ searchResults: results.map(r => r.item) });
      }
    } else {
      set({ searchResults: null });
    }
  },
  
  openCompose: (data = null) => set({ 
    isComposeOpen: true, 
    composeData: data 
  }),
  
  closeCompose: () => set({ 
    isComposeOpen: false, 
    composeData: null 
  }),

  toggleEmailSelection: (emailId) => set((state) => ({
    selectedEmails: state.selectedEmails.includes(emailId)
      ? state.selectedEmails.filter(id => id !== emailId)
      : [...state.selectedEmails, emailId],
  })),

  selectAllEmails: () => {
    const filteredEmails = get().getFilteredEmails();
    set({ selectedEmails: filteredEmails.map(e => e.id) });
  },

  clearSelection: () => set({ selectedEmails: [] }),

  toggleStar: async (emailId) => {
    const { emails, selectedEmail, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    const newStarred = !email.starred;
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, starred: newStarred } : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId 
        ? { ...state.selectedEmail, starred: newStarred }
        : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email.uid) {
      try {
        await emailsApi.toggleStar(selectedFolder, email.uid, newStarred);
      } catch (error) {
        console.error('Failed to toggle star:', error);
        // Revert on error
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === emailId ? { ...e, starred: !newStarred } : e
          ),
        }));
      }
    }
  },

  toggleImportant: async (emailId) => {
    const { emails, selectedEmail, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    const newImportant = !email.important;
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, important: newImportant } : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId 
        ? { ...state.selectedEmail, important: newImportant }
        : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email.uid) {
      try {
        await emailsApi.markAsImportant(selectedFolder, email.uid, newImportant);
      } catch (error) {
        console.error('Failed to toggle important:', error);
        // Revert on error
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === emailId ? { ...e, important: !newImportant } : e
          ),
        }));
      }
    }
  },

  markAsRead: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, read: true } : e
      ),
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.markAsRead(selectedFolder, email.uid, true);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  },

  markAsUnread: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, read: false } : e
      ),
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.markAsRead(selectedFolder, email.uid, false);
      } catch (error) {
        console.error('Failed to mark as unread:', error);
      }
    }
  },

  markSelectedAsRead: async () => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id) ? { ...email, read: true } : email
      ),
      selectedEmails: [],
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToUpdate = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToUpdate.length > 0) {
        try {
          await emailsApi.batchMarkAsRead(emailsToUpdate, true);
        } catch (error) {
          console.error('Failed to batch mark as read:', error);
        }
      }
    }
  },

  markSelectedAsUnread: async () => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id) ? { ...email, read: false } : email
      ),
      selectedEmails: [],
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToUpdate = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToUpdate.length > 0) {
        try {
          await emailsApi.batchMarkAsRead(emailsToUpdate, false);
        } catch (error) {
          console.error('Failed to batch mark as unread:', error);
        }
      }
    }
  },

  deleteEmail: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId 
          ? { ...e, labels: ['trash'] } 
          : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.delete(selectedFolder, email.uid);
      } catch (error) {
        console.error('Failed to delete email:', error);
      }
    }
  },

  deleteSelected: async () => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id)
          ? { ...email, labels: ['trash'] }
          : email
      ),
      selectedEmails: [],
      selectedEmail: state.selectedEmails.includes(state.selectedEmail?.id) ? null : state.selectedEmail,
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToDelete = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToDelete.length > 0) {
        try {
          await emailsApi.batchDelete(emailsToDelete);
        } catch (error) {
          console.error('Failed to batch delete:', error);
        }
      }
    }
  },

  archiveEmail: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId 
          ? { ...e, labels: ['archive'] } 
          : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.archive(selectedFolder, email.uid);
      } catch (error) {
        console.error('Failed to archive email:', error);
      }
    }
  },

  archiveSelected: async () => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id)
          ? { ...email, labels: ['archive'] }
          : email
      ),
      selectedEmails: [],
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToArchive = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToArchive.length > 0) {
        try {
          await emailsApi.batchArchive(emailsToArchive);
        } catch (error) {
          console.error('Failed to batch archive:', error);
        }
      }
    }
  },

  permanentlyDelete: (emailId) => set((state) => ({
    emails: state.emails.filter((email) => email.id !== emailId),
    selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
  })),

  restoreEmail: (emailId) => set((state) => ({
    emails: state.emails.map((email) =>
      email.id === emailId 
        ? { ...email, labels: ['inbox'] } 
        : email
    ),
  })),

  addLabel: (emailId, labelId) => set((state) => ({
    emails: state.emails.map((email) =>
      email.id === emailId && !email.labels.includes(labelId)
        ? { ...email, labels: [...email.labels, labelId] }
        : email
    ),
  })),

  removeLabel: (emailId, labelId) => set((state) => ({
    emails: state.emails.map((email) =>
      email.id === emailId
        ? { ...email, labels: email.labels.filter(l => l !== labelId) }
        : email
    ),
  })),

  createLabel: (name, color) => set((state) => ({
    labels: [
      ...state.labels,
      { id: name.toLowerCase().replace(/\s+/g, '-'), name, color },
    ],
  })),

  updateLabel: (labelId, name, color) => set((state) => ({
    labels: state.labels.map(l => 
      l.id === labelId ? { ...l, name, color } : l
    ),
  })),

  deleteLabel: (labelId) => set((state) => ({
    labels: state.labels.filter(l => l.id !== labelId),
    emails: state.emails.map(email => ({
      ...email,
      labels: email.labels.filter(l => l !== labelId),
    })),
  })),

  moveToFolder: (emailId, folder) => set((state) => ({
    emails: state.emails.map((email) => {
      if (email.id === emailId) {
        const systemFolders = ['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'];
        const userLabels = email.labels.filter(l => !systemFolders.includes(l));
        return { ...email, labels: [folder, ...userLabels] };
      }
      return email;
    }),
    selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
  })),

  snoozeEmail: (emailId, until) => set((state) => ({
    emails: state.emails.map((email) =>
      email.id === emailId
        ? { ...email, snoozedUntil: until, labels: email.labels.filter(l => l !== 'inbox') }
        : email
    ),
  })),

  sendEmail: async (emailData) => {
    const { isApiEnabled } = get();
    
    // Close compose immediately
    set({ isComposeOpen: false, composeData: null });
    
    if (isApiEnabled) {
      try {
        const result = await emailsApi.send({
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject,
          body: emailData.body,
          attachments: (emailData.attachments || []).map(att => ({
            filename: att.name || att.filename,
            content: att.content || '',
            contentType: att.type || att.contentType,
          })),
        });
        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
      }
    } else {
      // Fallback to local mock
      set((state) => ({
        emails: [
          {
            id: Date.now().toString(),
            from: { name: 'You', email: 'user@example.com' },
            to: emailData.to,
            cc: emailData.cc || [],
            bcc: emailData.bcc || [],
            subject: emailData.subject,
            body: emailData.body,
            snippet: emailData.body.replace(/<[^>]*>/g, '').substring(0, 100),
            date: new Date(),
            read: true,
            starred: false,
            important: false,
            labels: ['sent'],
            attachments: emailData.attachments || [],
            category: 'primary',
            scheduledAt: emailData.scheduledAt || null,
          },
          ...state.emails,
        ],
      }));
      return { success: true };
    }
  },

  scheduleSend: (emailData, sendAt) => {
    const { sendEmail } = get();
    sendEmail({ ...emailData, scheduledAt: sendAt });
  },

  saveDraft: async (emailData, existingDraftId = null) => {
    const { isApiEnabled } = get();
    
    if (isApiEnabled) {
      try {
        const result = await emailsApi.saveDraft({
          to: emailData.to || [],
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject || '',
          body: emailData.body || '',
        });
        return { success: true, uid: result.uid };
      } catch (error) {
        console.error('Failed to save draft:', error);
        // Fallback to local storage
      }
    }
    
    // Local fallback
    const draftData = {
      id: existingDraftId || Date.now().toString(),
      from: { name: 'You', email: 'user@example.com' },
      to: emailData.to || [{ name: '', email: '' }],
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      subject: emailData.subject || '(no subject)',
      body: emailData.body || '',
      snippet: (emailData.body || '').replace(/<[^>]*>/g, '').substring(0, 100),
      date: new Date(),
      read: true,
      starred: false,
      important: false,
      labels: ['drafts'],
      attachments: emailData.attachments || [],
      category: 'primary',
    };

    set((state) => {
      if (existingDraftId) {
        return {
          emails: state.emails.map(e => e.id === existingDraftId ? draftData : e),
        };
      }
      return {
        emails: [draftData, ...state.emails],
      };
    });
    
    return { success: true };
  },

  reportSpam: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, labels: ['spam'] } : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.markAsSpam(selectedFolder, email.uid);
      } catch (error) {
        console.error('Failed to mark as spam:', error);
      }
    }
  },

  reportNotSpam: async (emailId) => {
    const { emails, isApiEnabled, selectedFolder } = get();
    const email = emails.find(e => e.id === emailId);
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId ? { ...e, labels: ['inbox'] } : e
      ),
      selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
    }));
    
    // API call
    if (isApiEnabled && email?.uid) {
      try {
        await emailsApi.markAsNotSpam(selectedFolder, email.uid);
      } catch (error) {
        console.error('Failed to mark as not spam:', error);
      }
    }
  },

  reportSelectedAsSpam: async () => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id)
          ? { ...email, labels: ['spam'] }
          : email
      ),
      selectedEmails: [],
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToSpam = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToSpam.length > 0) {
        try {
          await emailsApi.batchSpam(emailsToSpam);
        } catch (error) {
          console.error('Failed to batch mark as spam:', error);
        }
      }
    }
  },

  starSelected: async (starred = true) => {
    const { emails, selectedEmails, isApiEnabled, selectedFolder } = get();
    
    // Optimistic update
    set((state) => ({
      emails: state.emails.map((email) =>
        state.selectedEmails.includes(email.id)
          ? { ...email, starred }
          : email
      ),
      selectedEmails: [],
    }));
    
    // API batch call
    if (isApiEnabled) {
      const emailsToStar = emails
        .filter(e => selectedEmails.includes(e.id) && e.uid)
        .map(e => ({ folder: selectedFolder, uid: e.uid }));
      
      if (emailsToStar.length > 0) {
        try {
          await emailsApi.batchStar(emailsToStar, starred);
        } catch (error) {
          console.error('Failed to batch star:', error);
        }
      }
    }
  },

  fetchStarredEmails: async (limit = 100) => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return;
    
    set({ isLoading: true });
    try {
      const result = await emailsApi.getStarred(limit);
      set({ 
        emails: result.emails,
        isLoading: false,
      });
      return result;
    } catch (error) {
      console.error('Failed to fetch starred emails:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchThread: async (folder, uid) => {
    const { isApiEnabled } = get();
    if (!isApiEnabled) return null;
    
    try {
      const result = await emailsApi.getThread(folder, uid);
      return result;
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      throw error;
    }
  },

  updateDraft: async (folder, uid, draftData) => {
    const { isApiEnabled } = get();
    
    if (isApiEnabled) {
      try {
        const result = await emailsApi.updateDraft(folder, uid, {
          to: draftData.to || [],
          cc: draftData.cc || [],
          bcc: draftData.bcc || [],
          subject: draftData.subject || '',
          body: draftData.body || '',
        });
        return { success: true, uid: result.uid };
      } catch (error) {
        console.error('Failed to update draft:', error);
        throw error;
      }
    }
    
    // Local fallback
    set((state) => ({
      emails: state.emails.map(e => 
        e.id === `${folder}-${uid}` 
          ? { ...e, ...draftData, date: new Date() }
          : e
      ),
    }));
    return { success: true };
  },

  deleteDraft: async (folder, uid) => {
    const { isApiEnabled } = get();
    
    // Optimistic update
    const emailId = `${folder}-${uid}`;
    set((state) => ({
      emails: state.emails.filter(e => e.id !== emailId),
      selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail,
    }));
    
    if (isApiEnabled) {
      try {
        await emailsApi.deleteDraft(folder, uid);
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
    }
  },

  emptyTrash: async () => {
    const { isApiEnabled, folders } = get();
    
    // Find trash folder
    const trashFolder = folders.find(f => 
      f.type === 'trash' || 
      ['trash', 'deleted', 'deleted items'].includes(f.name.toLowerCase())
    );
    
    if (!trashFolder) return;
    
    // Optimistic update - remove all trash emails
    set((state) => ({
      emails: state.emails.filter(e => !e.labels.includes('trash')),
    }));
    
    if (isApiEnabled) {
      try {
        await foldersApi.empty(trashFolder.path);
      } catch (error) {
        console.error('Failed to empty trash:', error);
      }
    }
  },

  emptySpam: async () => {
    const { isApiEnabled, folders } = get();
    
    // Find spam folder
    const spamFolder = folders.find(f => 
      f.type === 'spam' || 
      ['spam', 'junk'].includes(f.name.toLowerCase())
    );
    
    if (!spamFolder) return;
    
    // Optimistic update - remove all spam emails
    set((state) => ({
      emails: state.emails.filter(e => !e.labels.includes('spam')),
    }));
    
    if (isApiEnabled) {
      try {
        await foldersApi.empty(spamFolder.path);
      } catch (error) {
        console.error('Failed to empty spam:', error);
      }
    }
  },

  getFilteredEmails: () => {
    const { emails, selectedFolder, searchResults, searchQuery } = get();
    
    if (searchQuery && searchResults) {
      return searchResults;
    }

    if (selectedFolder === 'starred') {
      return emails
        .filter((email) => email.starred && !email.labels.includes('trash'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (selectedFolder === 'important') {
      return emails
        .filter((email) => email.important && !email.labels.includes('trash'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (selectedFolder === 'all') {
      return emails
        .filter((email) => !email.labels.includes('trash') && !email.labels.includes('spam'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const filtered = emails.filter((email) => email.labels.includes(selectedFolder));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getUnreadCount: (folder) => {
    const { emails } = get();
    
    if (folder === 'starred') {
      return emails.filter(e => e.starred && !e.read && !e.labels.includes('trash')).length;
    }
    if (folder === 'important') {
      return emails.filter(e => e.important && !e.read && !e.labels.includes('trash')).length;
    }
    
    return emails.filter((email) => email.labels.includes(folder) && !email.read).length;
  },

  getTotalCount: (folder) => {
    const { emails } = get();
    
    if (folder === 'starred') {
      return emails.filter(e => e.starred && !e.labels.includes('trash')).length;
    }
    if (folder === 'important') {
      return emails.filter(e => e.important && !e.labels.includes('trash')).length;
    }
    
    return emails.filter((email) => email.labels.includes(folder)).length;
  },

  getLabelById: (labelId) => {
    const { labels } = get();
    return labels.find(l => l.id === labelId);
  },
}));
