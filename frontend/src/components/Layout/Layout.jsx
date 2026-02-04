import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ComposeModal from '../Compose/ComposeModal';
import { useEmailStore } from '../../store/emailStore';
import { useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';

export default function Layout() {
  const isComposeOpen = useEmailStore((state) => state.isComposeOpen);
  const applyTheme = useThemeStore((state) => state.applyTheme);

  // Apply theme on mount
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Area */}
        <main className="flex-1 overflow-hidden bg-white dark:bg-gray-800 rounded-tl-2xl transition-colors">
          <Outlet />
        </main>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && <ComposeModal />}
    </div>
  );
}
