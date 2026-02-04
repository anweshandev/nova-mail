import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Minus, 
  Maximize2, 
  Minimize2,
  Send,
  Paperclip,
  Link,
  Smile,
  Image,
  Trash2,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  Undo,
  Redo,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useEmailStore } from '../../store/emailStore';
import toast from 'react-hot-toast';

// Common emoji list for quick access
const commonEmojis = ['😀', '😂', '😊', '❤️', '👍', '🎉', '🔥', '✨', '👋', '🙏', '💯', '✅'];

export default function ComposeModal() {
  const { closeCompose, composeData, sendEmail, saveDraft } = useEmailStore();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [to, setTo] = useState(composeData?.to?.map(t => t.email).join(', ') || '');
  const [subject, setSubject] = useState(composeData?.subject || '');
  const [body, setBody] = useState(composeData?.body || '');
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current && !isMinimized) {
      bodyRef.current.focus();
    }
  }, [isMinimized]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    bodyRef.current?.focus();
  };

  const handleSend = () => {
    if (!to.trim()) {
      toast.error('Please add at least one recipient');
      return;
    }

    const recipients = to.split(',').map(email => ({
      email: email.trim(),
      name: '',
    }));

    const ccRecipients = cc ? cc.split(',').map(email => ({ email: email.trim(), name: '' })) : [];
    const bccRecipients = bcc ? bcc.split(',').map(email => ({ email: email.trim(), name: '' })) : [];

    sendEmail({
      to: recipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: subject || '(no subject)',
      body: bodyRef.current?.innerHTML || body,
      attachments,
    });

    toast.success('Email sent!');
  };

  const handleScheduleSend = (date) => {
    if (!to.trim()) {
      toast.error('Please add at least one recipient');
      return;
    }

    const recipients = to.split(',').map(email => ({
      email: email.trim(),
      name: '',
    }));

    sendEmail({
      to: recipients,
      subject: subject || '(no subject)',
      body: bodyRef.current?.innerHTML || body,
      scheduledAt: date,
      attachments,
    });

    toast.success(`Email scheduled for ${date.toLocaleString()}`);
    setShowScheduleMenu(false);
  };

  const handleDiscard = () => {
    const hasContent = to || subject || (bodyRef.current?.innerText?.trim());
    if (hasContent) {
      if (confirm('Discard this draft?')) {
        closeCompose();
      }
    } else {
      closeCompose();
    }
  };

  const handleSaveDraft = () => {
    saveDraft({
      to: to ? to.split(',').map(email => ({ email: email.trim(), name: '' })) : [],
      cc: cc ? cc.split(',').map(email => ({ email: email.trim(), name: '' })) : [],
      bcc: bcc ? bcc.split(',').map(email => ({ email: email.trim(), name: '' })) : [],
      subject,
      body: bodyRef.current?.innerHTML || body,
      attachments,
    });
    toast.success('Draft saved');
    closeCompose();
  };

  const handleClose = () => {
    const hasContent = to || subject || (bodyRef.current?.innerText?.trim());
    if (hasContent) {
      handleSaveDraft();
    } else {
      closeCompose();
    }
  };

  const handleInsertEmoji = (emoji) => {
    const selection = window.getSelection();
    if (bodyRef.current && selection.rangeCount > 0) {
      bodyRef.current.focus();
      document.execCommand('insertText', false, emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleInsertLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      const html = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      bodyRef.current?.focus();
      document.execCommand('insertHTML', false, html);
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const modalClasses = isFullscreen
    ? 'fixed inset-4 z-50'
    : isMinimized
    ? 'fixed bottom-0 right-20 w-72 z-50'
    : 'fixed bottom-0 right-20 w-[560px] z-50';

  return (
    <div className={`${modalClasses} compose-modal`}>
      <div className={`bg-white dark:bg-gray-800 rounded-t-lg shadow-2xl border border-gray-300 dark:border-gray-600 flex flex-col ${isFullscreen ? 'h-full rounded-lg' : isMinimized ? '' : 'h-[560px]'}`}>
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 text-white rounded-t-lg cursor-pointer"
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <span className="text-sm font-medium truncate">
            {subject || 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(!isFullscreen);
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content - Hidden when minimized */}
        {!isMinimized && (
          <>
            {/* To Field */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-12">To</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="flex-1 py-2 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showCc ? '' : 'Cc Bcc'}
              </button>
            </div>

            {/* Cc/Bcc Fields */}
            {showCc && (
              <>
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-12">Cc</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 py-2 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-12">Bcc</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 py-2 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100"
                  />
                </div>
              </>
            )}

            {/* Subject Field */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-4">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full py-2 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-wrap">
              <button 
                onClick={() => execCommand('undo')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Undo"
              >
                <Undo className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => execCommand('redo')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Redo"
              >
                <Redo className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button 
                onClick={() => execCommand('bold')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors font-bold" 
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => execCommand('italic')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => execCommand('underline')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button 
                onClick={() => execCommand('insertUnorderedList')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Bulleted list"
              >
                <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => execCommand('insertOrderedList')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button 
                onClick={() => execCommand('justifyLeft')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Align left"
              >
                <AlignLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => execCommand('removeFormat')}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-xs font-medium text-gray-600 dark:text-gray-400" 
                title="Remove formatting"
              >
                Tx
              </button>
            </div>

            {/* Body - ContentEditable */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div
                ref={bodyRef}
                contentEditable
                className="w-full h-full text-sm outline-none min-h-[100px] text-gray-900 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: body }}
                onInput={(e) => setBody(e.currentTarget.innerHTML)}
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div 
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm"
                    >
                      <Paperclip className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      <span className="truncate max-w-[150px] text-gray-900 dark:text-gray-100">{att.name}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">({formatFileSize(att.size)})</span>
                      <button 
                        onClick={() => removeAttachment(att.id)}
                        className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-1">
                {/* Send Button with Schedule Option */}
                <div className="relative">
                  <div className="flex">
                    <button
                      onClick={handleSend}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-l-full text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                    <button
                      onClick={() => setShowScheduleMenu(!showScheduleMenu)}
                      className="px-2 py-2 bg-blue-600 text-white rounded-r-full text-sm font-medium hover:bg-blue-700 transition-colors border-l border-blue-500"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Schedule Menu */}
                  {showScheduleMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowScheduleMenu(false)} />
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-2">
                        <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Schedule send</p>
                        <button
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(8, 0, 0, 0);
                            handleScheduleSend(tomorrow);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Clock className="w-4 h-4" />
                          Tomorrow morning (8:00 AM)
                        </button>
                        <button
                          onClick={() => {
                            const date = new Date();
                            date.setDate(date.getDate() + 1);
                            date.setHours(13, 0, 0, 0);
                            handleScheduleSend(date);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Clock className="w-4 h-4" />
                          Tomorrow afternoon (1:00 PM)
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" 
                  title="Attach files"
                >
                  <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>

                {/* Link Dialog */}
                <div className="relative">
                  <button 
                    onClick={() => setShowLinkDialog(!showLinkDialog)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" 
                    title="Insert link"
                  >
                    <Link className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  {showLinkDialog && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowLinkDialog(false)} />
                      <div className="absolute left-0 bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Insert link</p>
                        <input
                          type="text"
                          placeholder="Text to display"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowLinkDialog(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleInsertLink}
                            disabled={!linkUrl}
                            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                          >
                            Insert
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Emoji Picker */}
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" 
                    title="Insert emoji"
                  >
                    <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute left-0 bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-2">
                        <div className="grid grid-cols-6 gap-1">
                          {commonEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleInsertEmoji(emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" title="Insert photo">
                  <Image className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleDiscard}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Discard"
                >
                  <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
