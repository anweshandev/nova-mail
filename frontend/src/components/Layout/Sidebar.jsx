import { useState } from 'react';
import { 
  Inbox, 
  Star, 
  Send, 
  FileText, 
  Trash2, 
  Archive, 
  Plus,
  Pencil,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  X,
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
    labels,
    createLabel,
    deleteLabel,
    updateLabel,
  } = useEmailStore();

  const [labelsExpanded, setLabelsExpanded] = useState(true);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1a73e8');
  const [labelMenuOpen, setLabelMenuOpen] = useState(null);

  const colorOptions = [
    '#ea4335', '#fbbc04', '#34a853', '#1a73e8', 
    '#9334e9', '#ff6d01', '#f538a0', '#607d8b'
  ];

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName('');
      setNewLabelColor('#1a73e8');
      setShowLabelModal(false);
    }
  };

  const handleEditLabel = () => {
    if (editingLabel && newLabelName.trim()) {
      updateLabel(editingLabel.id, newLabelName.trim(), newLabelColor);
      setEditingLabel(null);
      setNewLabelName('');
      setNewLabelColor('#1a73e8');
      setShowLabelModal(false);
    }
  };

  const handleDeleteLabel = (labelId) => {
    if (confirm('Delete this label? Emails with this label will not be deleted.')) {
      deleteLabel(labelId);
      setLabelMenuOpen(null);
    }
  };

  const openEditModal = (label) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
    setShowLabelModal(true);
    setLabelMenuOpen(null);
  };

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

      {/* Labels */}
      <div className="mt-6">
        <button
          onClick={() => setLabelsExpanded(!labelsExpanded)}
          className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {labelsExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1">
            Labels
          </h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingLabel(null);
              setNewLabelName('');
              setNewLabelColor('#1a73e8');
              setShowLabelModal(true);
            }}
            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </button>

        {labelsExpanded && (
          <nav className="space-y-1 mt-1">
            {labels.map((label) => {
              const isActive = selectedFolder === label.id;
              
              return (
                <div key={label.id} className="relative group">
                  <button
                    onClick={() => setSelectedFolder(label.id)}
                    className={`sidebar-item w-full flex items-center gap-3 px-4 py-2 rounded-r-full text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                  </button>
                  
                  {/* Label Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLabelMenuOpen(labelMenuOpen === label.id ? null : label.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>

                  {/* Label Menu Dropdown */}
                  {labelMenuOpen === label.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setLabelMenuOpen(null)} 
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                        <button
                          onClick={() => openEditModal(label)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(label.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Create/Edit Label Modal */}
      {showLabelModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
            onClick={() => {
              setShowLabelModal(false);
              setEditingLabel(null);
            }}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {editingLabel ? 'Edit label' : 'New label'}
              </h3>
              <button 
                onClick={() => {
                  setShowLabelModal(false);
                  setEditingLabel(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />

            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      newLabelColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLabelModal(false);
                  setEditingLabel(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingLabel ? handleEditLabel : handleCreateLabel}
                disabled={!newLabelName.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingLabel ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
