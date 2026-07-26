import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginAccount, registerAccount, Profile } from '../multiplayer/api';

const TOKEN_KEY = 'bam-baroh-auth-token';

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

interface AuthContextValue {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const res = await fetchMe(token);
    if (res.ok && res.data) setProfile(res.data.profile);
    else {
      setToken(null);
      storeToken(null);
      setProfile(null);
    }
  }, [token]);

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await loginAccount(username, password);
    setLoading(false);
    if (res.ok && res.data) {
      storeToken(res.data.token);
      setToken(res.data.token);
      setProfile(res.data.profile);
      return true;
    }
    setError(res.error ?? 'Could not sign in.');
    return false;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await registerAccount(username, password);
    setLoading(false);
    if (res.ok && res.data) {
      storeToken(res.data.token);
      setToken(res.data.token);
      setProfile(res.data.profile);
      return true;
    }
    setError(res.error ?? 'Could not create account.');
    return false;
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ token, profile, loading, error, clearError, login, register, logout, refreshProfile }),
    [token, profile, loading, error, clearError, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
