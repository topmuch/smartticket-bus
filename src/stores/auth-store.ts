import { create } from 'zustand';

export type UserRole = 'SUPERADMIN' | 'OPERATOR' | 'CONTROLLER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

const defaultUser: User = {
  id: 'default-admin',
  email: 'admin@smartticket.bus',
  name: 'Super Administrateur',
  role: 'SUPERADMIN',
  phone: '+221 77 123 00 00',
};

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

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: defaultUser,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: true,
  hasHydrated: true,

  setHasHydrated: () => {
    set({ hasHydrated: true });
  },

  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Erreur de connexion' };
      }

      const accessToken = data.data.accessToken;
      const refreshToken = data.data.refreshToken;

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
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();

      if (!data.success) {
        get().logout();
        return false;
      }

      const newAccessToken = data.data.accessToken || data.data.access_token;

      set({
        accessToken: newAccessToken,
        refreshToken: data.data.refreshToken || data.data.refresh_token || refreshToken,
      });

      return true;
    } catch {
      return false;
    }
  },

  updateTokens: (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken });
  },

  validateSession: async () => {
    return true;
  },
}));
