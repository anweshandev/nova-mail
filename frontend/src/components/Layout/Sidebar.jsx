import { 
  Inbox, 
  Star, 
  Send, 
  FileText, 
  Trash2, 
  Archive, 
  AlertCircle,
  Pencil,
  Mail,
  AlertOctagon
} from 'lucide-react';
import { useEmailStore } from '../../store/emailStore';

const folders = [
  { id: 'inbox', name: 'Inbox', icon: Inbox, showCount: true },
  { id: 'starred', name: 'Starred', icon: Star },
  { id: 'important', name: 'Important', icon: AlertCircle },
  { id: 'sent', name: 'Sent', icon: Send },
  { id: 'drafts', name: 'Drafts', icon: FileText, showCount: true },
  { id: 'spam', name: 'Spam', icon: AlertOctagon, showCount: true },
  { id: 'all', name: 'All Mail', icon: Mail },
  { id: 'archive', name: 'Archive', icon: Archive },
  { id: 'trash', name: 'Trash', icon: Trash2 },
];

export default function Sidebar() {
  const { 
    selectedFolder, 
    setSelectedFolder, 
    openCompose, 
    getUnreadCount,
  } = useEmailStore();

  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-900 p-4 flex-shrink-0 overflow-y-auto transition-colors">
      {/* Compose Button */}
      <button
        onClick={() => openCompose()}
        className="flex items-center gap-3 px-6 py-4 bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-2xl shadow-sm hover:shadow-md transition-all mb-4"
      >
        <Pencil className="w-5 h-5" />
        <span className="font-medium">Compose</span>
      </button>

      {/* Folders */}
      <nav className="space-y-1">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const unreadCount = folder.showCount ? getUnreadCount(folder.id) : 0;
          const isActive = selectedFolder === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`sidebar-item w-full flex items-center gap-3 px-4 py-2 rounded-r-full text-sm transition-colors ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">{folder.name}</span>
              {unreadCount > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
