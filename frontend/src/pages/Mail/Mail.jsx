import { useEffect, useCallback } from 'react';
import EmailList from '../../components/EmailList';
import EmailView from '../../components/EmailView';
import { useEmailStore } from '../../store/emailStore';
import { useSettingsStore } from '../../store/settingsStore';
import toast from 'react-hot-toast';

export default function Mail() {
  const { 
    selectedEmail, 
    setSelectedEmail,
    getFilteredEmails,
    toggleStar,
    archiveEmail,
    deleteEmail,
    restoreEmail,
    openCompose,
    markAsRead,
    markAsUnread,
    fetchEmails,
    fetchFolders,
    fetchUnreadCounts,
    startPolling,
    stopPolling,
    selectedFolder,
  } = useEmailStore();

  const { readingPane } = useSettingsStore();
  const emails = getFilteredEmails();

  // Fetch emails and folders on mount, start polling
  useEffect(() => {
    const initializeMailbox = async () => {
      try {
        await Promise.all([
          fetchFolders(),
          fetchEmails(selectedFolder),
          fetchUnreadCounts(),
        ]);
      } catch (error) {
        console.error('Failed to initialize mailbox:', error);
        toast.error('Failed to load emails');
      }
    };

    initializeMailbox();
    
    // Start polling for new emails every 2 minutes
    startPolling(120000);
    
    // Cleanup polling on unmount
    return () => {
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    const currentIndex = selectedEmail ? emails.findIndex(email => email.id === selectedEmail.id) : -1;

    switch (e.key.toLowerCase()) {
      case 'j': // Next email
        e.preventDefault();
        if (currentIndex < emails.length - 1) {
          const nextEmail = emails[currentIndex + 1];
          setSelectedEmail(nextEmail);
          if (!nextEmail.read) markAsRead(nextEmail.id);
        }
        break;
      
      case 'k': // Previous email
        e.preventDefault();
        if (currentIndex > 0) {
          const prevEmail = emails[currentIndex - 1];
          setSelectedEmail(prevEmail);
          if (!prevEmail.read) markAsRead(prevEmail.id);
        }
        break;
      
      case 'o': // Open email
      case 'enter':
        if (!selectedEmail && emails.length > 0) {
          e.preventDefault();
          const firstEmail = emails[0];
          setSelectedEmail(firstEmail);
          if (!firstEmail.read) markAsRead(firstEmail.id);
        }
        break;
      
      case 'u': // Back to list
      case 'escape':
        if (selectedEmail) {
          e.preventDefault();
          setSelectedEmail(null);
        }
        break;
      
      case 's': // Star/unstar
        if (selectedEmail) {
          e.preventDefault();
          toggleStar(selectedEmail.id);
        }
        break;
      
      case 'e': // Archive
        if (selectedEmail) {
          e.preventDefault();
          const emailId = selectedEmail.id;
          archiveEmail(emailId);
          toast((t) => (
            <div className="flex items-center gap-3">
              <span>Conversation archived</span>
              <button
                onClick={() => {
                  restoreEmail(emailId);
                  toast.dismiss(t.id);
                }}
                className="text-blue-600 font-medium hover:underline"
              >
                Undo
              </button>
            </div>
          ), { duration: 5000 });
        }
        break;
      
      case '#': // Delete
        if (selectedEmail) {
          e.preventDefault();
          const emailId = selectedEmail.id;
          deleteEmail(emailId);
          toast((t) => (
            <div className="flex items-center gap-3">
              <span>Moved to Trash</span>
              <button
                onClick={() => {
                  restoreEmail(emailId);
                  toast.dismiss(t.id);
                }}
                className="text-blue-600 font-medium hover:underline"
              >
                Undo
              </button>
            </div>
          ), { duration: 5000 });
        }
        break;
      
      case 'r': // Reply
        if (selectedEmail && !e.shiftKey) {
          e.preventDefault();
          openCompose({
            to: [selectedEmail.from],
            subject: `Re: ${selectedEmail.subject}`,
            inReplyTo: selectedEmail.id,
          });
        }
        break;
      
      case 'a': // Reply all
        if (selectedEmail && e.shiftKey) {
          e.preventDefault();
          const allRecipients = [
            selectedEmail.from,
            ...(selectedEmail.to || []).filter(r => r.email !== 'user@example.com'),
            ...(selectedEmail.cc || []),
          ];
          openCompose({
            to: allRecipients,
            subject: `Re: ${selectedEmail.subject}`,
            inReplyTo: selectedEmail.id,
          });
        }
        break;
      
      case 'c': // Compose
        if (!selectedEmail) {
          e.preventDefault();
          openCompose();
        }
        break;
      
      case '/': // Focus search
        e.preventDefault();
        document.querySelector('input[placeholder="Search mail"]')?.focus();
        break;
      
      default:
        break;
    }
  }, [selectedEmail, emails, setSelectedEmail, toggleStar, archiveEmail, deleteEmail, restoreEmail, openCompose, markAsRead]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // No split mode - show list or email view, not both
  if (readingPane === 'none') {
    return (
      <div className="h-full flex flex-col">
        {selectedEmail ? (
          <div className="flex-1 flex flex-col">
            <EmailView />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <EmailList />
          </div>
        )}
      </div>
    );
  }

  // Below inbox - vertical stack
  if (readingPane === 'below') {
    return (
      <div className="h-full flex flex-col">
        {/* Email List - Top half */}
        <div className={`${selectedEmail ? 'h-2/5' : 'flex-1'} flex flex-col border-b border-gray-200 dark:border-gray-700 overflow-hidden`}>
          <EmailList />
        </div>

        {/* Email View - Bottom half (only when email selected) */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <EmailView />
          </div>
        )}
      </div>
    );
  }

  // Right of inbox - horizontal split (default)
  return (
    <div className="h-full flex">
      {/* Email List - Hidden on mobile when email is selected */}
      <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 lg:w-[450px] border-r border-gray-200 dark:border-gray-700 flex-shrink-0`}>
        <EmailList />
      </div>

      {/* Email View - Hidden on mobile when no email is selected */}
      <div className={`${selectedEmail ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        <EmailView />
      </div>
    </div>
  );
}
