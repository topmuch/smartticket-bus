import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toBackendUrl } from '@/lib/api';

export type UserRole = 'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  validateSession: () => Promise<boolean>;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setHasHydrated: () => {
        set({ hasHydrated: true });
      },

      login: async (email: string, password: string) => {
        try {
          // Express backend login: POST /api/auth/login
          // Response: { success, data: { user, tokens: { access_token, refresh_token } } }
          const res = await fetch(toBackendUrl('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (!data.success) {
            return { success: false, error: data.error || 'Erreur de connexion' };
          }

          // Express auth response uses nested tokens object
          const tokens = data.data.tokens || {};
          const accessToken = tokens.access_token || data.data.accessToken;
          const refreshToken = tokens.refresh_token || data.data.refreshToken;

          set({
            user: data.data.user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: 'Erreur réseau. Vérifiez votre connexion.' };
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          // Express backend refresh: POST /api/auth/refresh
          // Body: { refresh_token } (not { refreshToken })
          // Response: { success, data: { access_token } }
          const res = await fetch(toBackendUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const data = await res.json();

          if (!data.success) {
            get().logout();
            return false;
          }

          // Express refresh response uses access_token (not accessToken)
          const newAccessToken = data.data.access_token || data.data.accessToken;

          set({
            accessToken: newAccessToken,
            // Express refresh may not return a new refresh token
            refreshToken: data.data.refresh_token || data.data.refreshToken || refreshToken,
          });

          return true;
        } catch {
          return false;
        }
      },

      updateTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      /**
       * Validate current session by checking the local auth/me endpoint.
       * Clears auth state if the session is invalid.
       * Uses the local Next.js route (not Express backend) so it works standalone.
       */
      validateSession: async () => {
        const { accessToken, logout } = get();
        if (!accessToken) {
          set({ isAuthenticated: false, hasHydrated: true });
          return false;
        }

        try {
          // Use local Next.js /api/auth/me directly (not via toBackendUrl)
          const res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              set({
                user: data.data,
                isAuthenticated: true,
                hasHydrated: true,
              });
              return true;
            }
          }

          // Token is invalid - clear auth state
          logout();
          set({ hasHydrated: true });
          return false;
        } catch {
          // Network error - keep current state but mark as hydrated
          // so the page renders. Auth will be validated again on API calls.
          set({ hasHydrated: true });
          return false;
        }
      },
    }),
    {
      name: 'smartticket-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Auth store rehydration error:', error);
          }
          // Mark as hydrated after rehydration completes
          if (state) {
            state.hasHydrated = true;
          }
        };
      },
    }
  )
);
