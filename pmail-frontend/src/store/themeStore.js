import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system', // 'light', 'dark', 'system'
      
      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },
      
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        get().applyTheme();
      },
      
      applyTheme: () => {
        const { theme } = get();
        const root = document.documentElement;
        
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      },
      
      isDark: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return theme === 'dark';
      },
    }),
    {
      name: 'pmail-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme();
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, applyTheme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme();
    }
  });
}
