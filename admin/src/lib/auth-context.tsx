'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from './api';
import { CurrentUser } from './types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    try {
      const me = await apiFetch<CurrentUser>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    router.push('/login');
  }

  // For flows (2FA setup/login completion) that already got the fresh user object back
  // in their own response, so there's no need to fire a second, independently-failable
  // /auth/me request just to populate this context - see setUser in login-2fa/2fa-setup.
  function setAuthenticatedUser(newUser: CurrentUser) {
    setUser(newUser);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh: load, setUser: setAuthenticatedUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
