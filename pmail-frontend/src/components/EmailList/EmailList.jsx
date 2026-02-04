import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { 
  Star, 
  Paperclip, 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen, 
  Tag,
  MoreVertical,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Inbox,
  Send,
  FileText,
  Search,
  PanelRight,
  PanelBottom,
  Square
} from 'lucide-react';
import { useEmailStore } from '../../store/emailStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function EmailList() {
  const { 
    getFilteredEmails, 
    selectedEmail, 
    setSelectedEmail, 
    toggleStar, 
    toggleImportant,
    markAsRead,
    markAsUnread,
    selectedFolder,
    selectedEmails,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    deleteSelected,
    archiveSelected,
    markSelectedAsRead,
    markSelectedAsUnread,
    labels,
    addLabel,
    restoreEmail,
    searchQuery,
  } = useEmailStore();

  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReadingPaneMenu, setShowReadingPaneMenu] = useState(false);

  const { readingPane, setReadingPane } = useSettingsStore();
  const emails = getFilteredEmails();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Simulate refresh - in real app this would fetch new emails
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Inbox refreshed');
    }, 800);
  }, []);

  const handleDeleteSelected = () => {
    const count = selectedEmails.length;
    const deletedIds = [...selectedEmails];
    deleteSelected();
    
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>{count} conversation{count > 1 ? 's' : ''} moved to Trash</span>
        <button
          onClick={() => {
            deletedIds.forEach(id => restoreEmail(id));
            toast.dismiss(t.id);
            toast.success('Restored');
          }}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          Undo
        </button>
      </div>
    ), { duration: 5000 });
  };

  const handleArchiveSelected = () => {
    const count = selectedEmails.length;
    const archivedIds = [...selectedEmails];
    archiveSelected();
    
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>{count} conversation{count > 1 ? 's' : ''} archived</span>
        <button
          onClick={() => {
            archivedIds.forEach(id => restoreEmail(id));
            toast.dismiss(t.id);
            toast.success('Restored');
          }}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          Undo
        </button>
      </div>
    ), { duration: 5000 });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) {
      return format(d, 'h:mm a');
    } else if (isYesterday(d)) {
      return 'Yesterday';
    } else if (isThisYear(d)) {
      return format(d, 'MMM d');
    }
    return format(d, 'MM/dd/yy');
  };

  const getFolderTitle = () => {
    const titles = {
      inbox: 'Inbox',
      starred: 'Starred',
      important: 'Important',
      sent: 'Sent',
      drafts: 'Drafts',
      all: 'All Mail',
      archive: 'Archive',
      trash: 'Trash',
      spam: 'Spam',
    };
    return titles[selectedFolder] || selectedFolder;
  };

  const getEmptyStateInfo = () => {
    const states = {
      inbox: { icon: Inbox, title: 'Your inbox is empty', subtitle: 'Emails you receive will appear here' },
      starred: { icon: Star, title: 'No starred emails', subtitle: 'Star emails to find them easily later' },
      important: { icon: AlertCircle, title: 'No important emails', subtitle: 'Emails marked as important will appear here' },
      sent: { icon: Send, title: 'No sent emails', subtitle: 'Messages you send will appear here' },
      drafts: { icon: FileText, title: 'No drafts', subtitle: 'Emails you start writing will be saved here' },
      archive: { icon: Archive, title: 'No archived emails', subtitle: 'Archived emails will appear here' },
      trash: { icon: Trash2, title: 'Trash is empty', subtitle: 'Items in trash are deleted after 30 days' },
      spam: { icon: AlertCircle, title: 'No spam', subtitle: "Messages that look suspicious will appear here" },
      all: { icon: Mail, title: 'No emails', subtitle: 'Your emails will appear here' },
    };
    
    if (searchQuery) {
      return { icon: Search, title: 'No results found', subtitle: `No emails match "${searchQuery}"` };
    }
    
    return states[selectedFolder] || states.inbox;
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    if (!email.read) {
      markAsRead(email.id);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      selectAllEmails();
    } else {
      clearSelection();
    }
  };

  const isAllSelected = emails.length > 0 && selectedEmails.length === emails.length;
  const isSomeSelected = selectedEmails.length > 0 && selectedEmails.length < emails.length;
  const hasSelection = selectedEmails.length > 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 transition-colors">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2 flex-shrink-0 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <input 
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected;
            }}
            onChange={handleSelectAll}
            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-gray-700"
          />
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {hasSelection ? (
          // Bulk Actions
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleArchiveSelected}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Archive"
            >
              <Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={markSelectedAsRead}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Mark as read"
            >
              <MailOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={markSelectedAsUnread}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Mark as unread"
            >
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* Label Menu */}
            <div className="relative">
              <button
                onClick={() => setShowLabelMenu(!showLabelMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Add label"
              >
                <Tag className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              {showLabelMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLabelMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2">
                    <p className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">Label as:</p>
                    {labels.map(label => (
                      <button
                        key={label.id}
                        onClick={() => {
                          selectedEmails.forEach(id => addLabel(id, label.id));
                          clearSelection();
                          setShowLabelMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: label.color }} 
                        />
                        {label.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedEmails.length} selected</span>
          </div>
        ) : (
          // Normal header
          <>
            <button 
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ml-2" 
              title="Refresh"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            {/* Reading Pane Toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowReadingPaneMenu(!showReadingPaneMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" 
                title="Reading pane"
              >
                {readingPane === 'right' && <PanelRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                {readingPane === 'below' && <PanelBottom className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                {readingPane === 'none' && <Square className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
              </button>
              {showReadingPaneMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowReadingPaneMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2">
                    <p className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Reading pane</p>
                    <button
                      onClick={() => {
                        setReadingPane('none');
                        setShowReadingPaneMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${readingPane === 'none' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <Square className="w-4 h-4" />
                      No split
                    </button>
                    <button
                      onClick={() => {
                        setReadingPane('right');
                        setShowReadingPaneMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${readingPane === 'right' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <PanelRight className="w-4 h-4" />
                      Right of inbox
                    </button>
                    <button
                      onClick={() => {
                        setReadingPane('below');
                        setShowReadingPaneMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${readingPane === 'below' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <PanelBottom className="w-4 h-4" />
                      Below inbox
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex-1" />
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">{getFolderTitle()}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {emails.length} {emails.length === 1 ? 'email' : 'emails'}
            </span>
          </>
        )}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          (() => {
            const emptyState = getEmptyStateInfo();
            const Icon = emptyState.icon;
            return (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="w-24 h-24 mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Icon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{emptyState.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{emptyState.subtitle}</p>
              </div>
            );
          })()
        ) : (
          <ul>
            {emails.map((email) => {
              const isSelected = selectedEmails.includes(email.id);
              
              return (
                <li
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : selectedEmail?.id === email.id
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : email.read
                      ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleEmailSelection(email.id)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0 bg-white dark:bg-gray-700"
                  />

                  {/* Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(email.id);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        email.starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                      }`}
                    />
                  </button>

                  {/* Important */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImportant(email.id);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                  >
                    <AlertCircle
                      className={`w-4 h-4 ${
                        email.important
                          ? 'fill-yellow-100 text-yellow-600 dark:fill-yellow-900 dark:text-yellow-400'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                      }`}
                    />
                  </button>

                  {/* Sender */}
                  <div className={`w-44 flex-shrink-0 truncate ${!email.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                    {email.from.name || email.from.email}
                  </div>

                  {/* Labels */}
                  <div className="flex gap-1 flex-shrink-0">
                    {email.labels
                      .filter(l => !['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'].includes(l))
                      .slice(0, 2)
                      .map(labelId => {
                        const label = labels.find(l => l.id === labelId);
                        if (!label) return null;
                        return (
                          <span
                            key={labelId}
                            className="px-2 py-0.5 rounded-full text-xs text-white"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        );
                      })}
                  </div>

                  {/* Subject & Preview */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`truncate ${!email.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {email.subject}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 truncate hidden lg:inline">
                      - {(email.snippet || email.body.replace(/<[^>]*>/g, '')).substring(0, 80)}
                    </span>
                  </div>

                  {/* Attachment Icon */}
                  {email.attachments?.length > 0 && (
                    <Paperclip className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  )}

                  {/* Date */}
                  <div className={`text-sm flex-shrink-0 ${!email.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formatDate(email.date)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
