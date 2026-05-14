"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_LS_META_KEY } from "@/lib/auth/session";
import type { PublicAuthUser } from "@/lib/auth/users";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: PublicAuthUser | null;
  /** Nome da usare nei log (mai stringa vuota). */
  authorName: string;
  login: (username: string, password: string, remember: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FALLBACK_AUTHOR = "Utente CAB";

async function fetchMe(): Promise<PublicAuthUser | null> {
  const res = await fetch("/api/auth/me", { method: "GET", credentials: "same-origin" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: PublicAuthUser };
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicAuthUser | null>(null);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    setStatus(u ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password, remember }),
    });
    const data = (await res.json().catch(() => ({}))) as { user?: PublicAuthUser; error?: string };
    if (!res.ok) {
      return { ok: false as const, message: typeof data.error === "string" ? data.error : "Accesso negato." };
    }
    if (!data.user) {
      return { ok: false as const, message: "Risposta login non valida." };
    }
    setUser(data.user);
    setStatus("authenticated");
    try {
      if (remember) {
        localStorage.setItem(AUTH_LS_META_KEY, JSON.stringify({ remember: true, userId: data.user.id, at: Date.now() }));
      } else {
        localStorage.removeItem(AUTH_LS_META_KEY);
      }
    } catch {
      /* ignore */
    }
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    try {
      localStorage.removeItem(AUTH_LS_META_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
    setStatus("anonymous");
  }, []);

  const authorName = useMemo(() => {
    const n = user?.nome?.trim();
    return n || FALLBACK_AUTHOR;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      authorName,
      login,
      logout,
      refresh,
    }),
    [status, user, authorName, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return ctx;
}
