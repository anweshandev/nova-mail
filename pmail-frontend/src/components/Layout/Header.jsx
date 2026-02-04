import { useState } from 'react';
import { Menu, Search, Settings, HelpCircle, LogOut, User, Moon, Sun, Monitor, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useEmailStore } from '../../store/emailStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';

// Generate DiceBear avatar URL
const getAvatarUrl = (seed, size = 40) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
};

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { searchQuery, setSearchQuery, refreshEmails, isLoading, syncStatus } = useEmailStore();
  const { theme, setTheme } = useThemeStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const avatarSeed = user?.email || user?.name || 'default';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshEmails();
    } finally {
      setIsRefreshing(false);
    }
  };

  const themeOptions = [
    { id: 'light', name: 'Light', icon: Sun },
    { id: 'dark', name: 'Dark', icon: Moon },
    { id: 'system', name: 'System', icon: Monitor },
  ];

  const currentThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="h-16 bg-gray-100 dark:bg-gray-900 flex items-center px-4 gap-2 transition-colors">
      {/* Logo & Menu */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2 px-2">
          <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" className="fill-blue-500"/>
            <path d="M14 16L24 26L34 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 16H34V32C34 33.1046 33.1046 34 32 34H16C14.8954 34 14 33.1046 14 32V16Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xl text-gray-700 dark:text-gray-200 font-medium hidden sm:block">PMail</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mail"
            className="w-full py-2.5 pl-12 pr-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:shadow-lg transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Refresh Button */}
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
          title={syncStatus?.lastSync ? `Last synced: ${new Date(syncStatus.lastSync).toLocaleTimeString()}` : 'Refresh emails'}
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        <button className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Theme Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
            title="Change theme"
          >
            {(() => {
              const Icon = currentThemeIcon;
              return <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />;
            })()}
          </button>

          {showThemeMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemeMenu(false)} />
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setTheme(option.id);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        theme === option.id
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-full overflow-hidden hover:shadow-md transition-shadow ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600"
          >
            <img 
              src={getAvatarUrl(avatarSeed, 36)} 
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                <div className="p-4 text-center border-b border-gray-200 dark:border-gray-700">
                  <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-2">
                    <img 
                      src={getAvatarUrl(avatarSeed, 64)} 
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user?.name || 'User'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'user@example.com'}</p>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <User className="w-5 h-5" />
                    <span>Manage account</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
