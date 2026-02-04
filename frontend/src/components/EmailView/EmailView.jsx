import { useState } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Star, 
  Reply, 
  ReplyAll, 
  Forward, 
  Trash2, 
  Archive,
  MoreVertical,
  Paperclip,
  Download,
  Printer,
  Tag,
  AlertCircle,
  Mail,
  MailOpen,
  AlertOctagon,
  Undo,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useEmailStore } from '../../store/emailStore';
import { useSettingsStore } from '../../store/settingsStore';
import toast from 'react-hot-toast';

// Generate DiceBear avatar URL
const getAvatarUrl = (seed, size = 40) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
};

export default function EmailView() {
  const { 
    selectedEmail, 
    setSelectedEmail, 
    toggleStar, 
    toggleImportant,
    deleteEmail, 
    archiveEmail, 
    openCompose,
    markAsRead,
    markAsUnread,
    reportSpam,
    reportNotSpam,
    restoreEmail,
    labels,
    addLabel,
    removeLabel,
    selectedFolder,
    emptyTrash,
    emptySpam,
  } = useEmailStore();

  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFullRecipients, setShowFullRecipients] = useState(false);

  const { readingPane } = useSettingsStore();

  if (!selectedEmail) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 transition-colors">
        <svg className="w-32 h-32 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-lg">Select an email to read</p>
      </div>
    );
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleReply = () => {
    openCompose({
      to: [selectedEmail.from],
      subject: `Re: ${selectedEmail.subject}`,
      inReplyTo: selectedEmail.id,
    });
  };

  const handleReplyAll = () => {
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
  };

  const handleForward = () => {
    openCompose({
      subject: `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.from.name} <${selectedEmail.from.email}>\nDate: ${format(new Date(selectedEmail.date), 'PPpp')}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`,
    });
  };

  const handleDelete = () => {
    const emailId = selectedEmail.id;
    deleteEmail(emailId);
    
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>Conversation moved to Trash</span>
        <button
          onClick={() => {
            restoreEmail(emailId);
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

  const handleArchive = () => {
    const emailId = selectedEmail.id;
    archiveEmail(emailId);
    
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>Conversation archived</span>
        <button
          onClick={() => {
            restoreEmail(emailId);
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

  const handleReportSpam = () => {
    reportSpam(selectedEmail.id);
    toast.success('Reported as spam');
    setShowMoreMenu(false);
  };

  const handleNotSpam = () => {
    reportNotSpam(selectedEmail.id);
    toast.success('Marked as not spam, moved to inbox');
    setShowMoreMenu(false);
  };

  const handleRestore = () => {
    restoreEmail(selectedEmail.id);
    toast.success('Restored to inbox');
  };

  const handleEmptyTrash = () => {
    if (window.confirm('Permanently delete all messages in Trash?')) {
      emptyTrash();
      toast.success('Trash emptied');
    }
  };

  const handleEmptySpam = () => {
    if (window.confirm('Permanently delete all messages in Spam?')) {
      emptySpam();
      toast.success('Spam emptied');
    }
  };

  const handleToggleLabel = (labelId) => {
    if (selectedEmail.labels.includes(labelId)) {
      removeLabel(selectedEmail.id, labelId);
    } else {
      addLabel(selectedEmail.id, labelId);
    }
  };

  const emailLabels = selectedEmail.labels.filter(
    l => !['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'].includes(l)
  );

  const isTrash = selectedFolder === 'trash';
  const isSpam = selectedFolder === 'spam';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 transition-colors">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-1 flex-shrink-0 bg-white dark:bg-gray-800">
        <button
          onClick={() => setSelectedEmail(null)}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${readingPane === 'none' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          title="Back to list"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-1 ml-2">
          {isTrash || isSpam ? (
            <button 
              onClick={handleRestore}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Restore to inbox"
            >
              <Undo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          ) : (
            <button 
              onClick={handleArchive}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Archive"
            >
              <Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <button 
            onClick={handleDelete}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => selectedEmail.read ? markAsUnread(selectedEmail.id) : markAsRead(selectedEmail.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={selectedEmail.read ? 'Mark as unread' : 'Mark as read'}
          >
            {selectedEmail.read ? (
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <MailOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {/* Label Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowLabelMenu(!showLabelMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Labels"
            >
              <Tag className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            {showLabelMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLabelMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2">
                  <p className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">Labels</p>
                  {labels.map(label => {
                    const isApplied = selectedEmail.labels.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label.id)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={isApplied}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: label.color }} 
                        />
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => toggleImportant(selectedEmail.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={selectedEmail.important ? 'Mark as not important' : 'Mark as important'}
          >
            <AlertCircle className={`w-5 h-5 ${
              selectedEmail.important 
                ? 'fill-yellow-100 text-yellow-600 dark:fill-yellow-900 dark:text-yellow-400' 
                : 'text-gray-600 dark:text-gray-300'
            }`} />
          </button>
        </div>

        <div className="flex-1" />

        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Print">
          <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        {/* More Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {showMoreMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2">
                {isSpam ? (
                  <button
                    onClick={handleNotSpam}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Mail className="w-4 h-4" />
                    Not spam
                  </button>
                ) : (
                  <button
                    onClick={handleReportSpam}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    Report spam
                  </button>
                )}
                {isTrash && (
                  <button
                    onClick={handleEmptyTrash}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Empty trash
                  </button>
                )}
                {isSpam && (
                  <button
                    onClick={handleEmptySpam}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Empty spam
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Subject & Labels */}
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 flex-1">
            {selectedEmail.subject}
          </h1>
          <button
            onClick={() => toggleStar(selectedEmail.id)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <Star
              className={`w-6 h-6 ${
                selectedEmail.starred
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            />
          </button>
        </div>

        {/* Email Labels */}
        {emailLabels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {emailLabels.map(labelId => {
              const label = labels.find(l => l.id === labelId);
              if (!label) return null;
              return (
                <span
                  key={labelId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Sender Info - Gmail Style */}
        <div className="flex items-start gap-4 mb-6">
          <img 
            src={getAvatarUrl(selectedEmail.from.email, 40)} 
            alt="" 
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedEmail.from.name || selectedEmail.from.email}
              </span>
              {!showFullRecipients && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  &lt;{selectedEmail.from.email}&gt;
                </span>
              )}
            </div>
            
            {/* Collapsed Recipient View */}
            {!showFullRecipients ? (
              <button 
                onClick={() => setShowFullRecipients(true)}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span>
                  to {selectedEmail.to?.map(t => t.name || t.email.split('@')[0]).slice(0, 3).join(', ')}
                  {selectedEmail.to?.length > 3 && `, +${selectedEmail.to.length - 3}`}
                  {selectedEmail.cc?.length > 0 && `, ${selectedEmail.cc.map(c => c.name || c.email.split('@')[0]).join(', ')}`}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : (
              /* Expanded Recipient View - Gmail Style */
              <div className="mt-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-3 relative">
                <button 
                  onClick={() => setShowFullRecipients(false)}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  {/* From */}
                  <span className="text-gray-500 dark:text-gray-400">from:</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedEmail.from.name}</span>
                    {selectedEmail.from.name && (
                      <span className="text-gray-500 dark:text-gray-400"> &lt;{selectedEmail.from.email}&gt;</span>
                    )}
                    {!selectedEmail.from.name && (
                      <span className="text-gray-900 dark:text-gray-100">{selectedEmail.from.email}</span>
                    )}
                  </div>
                  
                  {/* To */}
                  <span className="text-gray-500 dark:text-gray-400">to:</span>
                  <div className="text-gray-700 dark:text-gray-300">
                    {selectedEmail.to?.map((recipient, idx) => (
                      <span key={idx}>
                        {recipient.name && (
                          <>
                            <span>{recipient.name}</span>
                            <span className="text-gray-500 dark:text-gray-400"> &lt;{recipient.email}&gt;</span>
                          </>
                        )}
                        {!recipient.name && recipient.email}
                        {idx < selectedEmail.to.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                  
                  {/* CC */}
                  {selectedEmail.cc?.length > 0 && (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">cc:</span>
                      <div className="text-gray-700 dark:text-gray-300">
                        {selectedEmail.cc.map((recipient, idx) => (
                          <span key={idx}>
                            {recipient.name && (
                              <>
                                <span>{recipient.name}</span>
                                <span className="text-gray-500 dark:text-gray-400"> &lt;{recipient.email}&gt;</span>
                              </>
                            )}
                            {!recipient.name && recipient.email}
                            {idx < selectedEmail.cc.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* BCC - only visible to sender */}
                  {selectedEmail.bcc?.length > 0 && (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">bcc:</span>
                      <div className="text-gray-700 dark:text-gray-300">
                        {selectedEmail.bcc.map((recipient, idx) => (
                          <span key={idx}>
                            {recipient.name && (
                              <>
                                <span>{recipient.name}</span>
                                <span className="text-gray-500 dark:text-gray-400"> &lt;{recipient.email}&gt;</span>
                              </>
                            )}
                            {!recipient.name && recipient.email}
                            {idx < selectedEmail.bcc.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Date */}
                  <span className="text-gray-500 dark:text-gray-400">date:</span>
                  <div className="text-gray-700 dark:text-gray-300">
                    {format(new Date(selectedEmail.date), 'MMM d, yyyy, h:mm a')}
                  </div>
                  
                  {/* Subject */}
                  <span className="text-gray-500 dark:text-gray-400">subject:</span>
                  <div className="text-gray-700 dark:text-gray-300">{selectedEmail.subject}</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Date - only show when collapsed */}
          {!showFullRecipients && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {format(new Date(selectedEmail.date), 'MMM d, yyyy, h:mm a')}
            </div>
          )}
        </div>

        {/* Attachments */}
        {selectedEmail.attachments?.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <Paperclip className="w-4 h-4" />
              <span>{selectedEmail.attachments.length} attachment{selectedEmail.attachments.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedEmail.attachments.map((attachment, index) => (
                <div
                  key={attachment.id || index}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReply}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>
          <button 
            onClick={handleReplyAll}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ReplyAll className="w-4 h-4" />
            Reply all
          </button>
          <button
            onClick={handleForward}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Forward className="w-4 h-4" />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}
