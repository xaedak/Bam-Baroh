import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginAccount, registerAccount, Profile } from '../multiplayer/api';
import { initDiscordAuth, isDiscordActivity } from '../discord/sdk';

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
  /** True once we've finished attempting the automatic Discord Activity login (success or not). */
  discordChecked: boolean;
  /** True if this session came from Discord (progression syncs to the account, not just localStorage). */
  viaDiscord: boolean;
  /** The player's cross-server progression blob, as returned by the Discord login exchange, if any. Consumed once by SaveContext to hydrate. */
  discordSave: unknown | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discordChecked, setDiscordChecked] = useState(false);
  const [viaDiscord, setViaDiscord] = useState(false);
  const [discordSave, setDiscordSave] = useState<unknown | null>(null);

  // If we're running as a Discord Activity, this silently signs the player
  // in with their Discord identity on load — no username/password screen.
  // Outside Discord it resolves to null immediately and the existing
  // manual login below still works exactly as before.
  useEffect(() => {
    let cancelled = false;
    if (!isDiscordActivity()) {
      setDiscordChecked(true);
      return undefined;
    }
    initDiscordAuth().then((result) => {
      if (cancelled) return;
      if (result) {
        storeToken(result.token);
        setToken(result.token);
        setProfile(result.profile);
        setDiscordSave(result.save ?? null);
        setViaDiscord(true);
      }
      setDiscordChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setViaDiscord(false);
    setDiscordSave(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      profile,
      loading,
      error,
      clearError,
      login,
      register,
      logout,
      refreshProfile,
      discordChecked,
      viaDiscord,
      discordSave,
    }),
    [
      token,
      profile,
      loading,
      error,
      clearError,
      login,
      register,
      logout,
      refreshProfile,
      discordChecked,
      viaDiscord,
      discordSave,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
