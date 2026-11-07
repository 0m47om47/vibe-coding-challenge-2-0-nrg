"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { SessionUser, Sport } from "@/types";

interface AuthValue {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** Creates a new academy and its first coach, and signs that coach in. */
  registerAcademy: (body: { academyName: string; town?: string; sports: Sport[]; username: string; password: string }) => Promise<SessionUser>;
  /** Reloads the signed-in user, e.g. after the academy's sports change. */
  refresh: () => Promise<void>;
  /** Called when any request comes back 401: forget the user so guards send them to /login. */
  expire: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.auth
      .me()
      .then((r) => alive && setUser(r.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.auth.login(username, password);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const registerAcademy = useCallback(async (body: { academyName: string; town?: string; sports: Sport[]; username: string; password: string }) => {
    const r = await api.auth.registerAcademy(body);
    setUser(r.user);
    return r.user;
  }, []);

  const refresh = useCallback(async () => {
    const r = await api.auth.me();
    setUser(r.user);
  }, []);

  const expire = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, loading, login, logout, registerAcademy, refresh, expire }),
    [user, loading, login, logout, registerAcademy, refresh, expire]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
