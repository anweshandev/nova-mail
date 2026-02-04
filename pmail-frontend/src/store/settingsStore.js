import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Reading pane options: 'right' | 'below' | 'none'
      readingPane: 'right',
      
      setReadingPane: (pane) => set({ readingPane: pane }),
    }),
    {
      name: 'pmail-settings',
    }
  )
);
