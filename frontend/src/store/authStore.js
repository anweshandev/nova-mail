import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      mailboxes: [],

      // Actions
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null,
      }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await authApi.login({
            email: credentials.email,
            password: credentials.password,
            imapServer: credentials.imapServer,
            imapPort: credentials.imapPort,
            smtpServer: credentials.smtpServer,
            smtpPort: credentials.smtpPort,
          });
          
          set({ 
            user: result.user,
            token: result.token,
            mailboxes: result.mailboxes || [],
            isAuthenticated: true, 
            isLoading: false,
            error: null,
          });
          
          return { success: true };
        } catch (error) {
          const message = error.message || 'Login failed';
          set({ 
            error: message, 
            isLoading: false 
          });
          return { success: false, error: message };
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.warn('Logout request failed:', error.message);
        }
        
        set({ 
          user: null,
          token: null,
          mailboxes: [],
          isAuthenticated: false,
          error: null,
        });
      },

      verifyToken: async () => {
        const { token } = get();
        if (!token) {
          return false;
        }
        
        try {
          const result = await authApi.verify();
          if (result.valid) {
            set({ user: result.user, isAuthenticated: true });
            return true;
          }
        } catch (error) {
          console.warn('Token verification failed:', error.message);
        }
        
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
        return false;
      },

      // Clear any errors
      clearError: () => set({ error: null }),
    }),
    {
      name: 'novamail-auth',
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mailboxes: state.mailboxes,
      }),
    }
  )
);
