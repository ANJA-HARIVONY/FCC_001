import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SESSION_IDLE_MS } from "@fcc/domain";

import { api } from "../api/client";

export interface SessionUser {
  userId: number;
  nom: string;
  role: string;
  idCiudad: number;
  idAgencia: number;
}

interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  remainingMs: number;
  login: (identifiant: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  stay: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  children,
  initialUser = null,
  now,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
  now?: number;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [loading, setLoading] = useState(initialUser == null);
  const [lastActivity, setLastActivity] = useState(() => now ?? Date.now());
  const [clock, setClock] = useState(() => now ?? Date.now());

  useEffect(() => {
    if (initialUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api<{ user: SessionUser }>("/api/auth/me")
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  useEffect(() => {
    if (now != null) {
      return;
    }
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [now]);

  const value = useMemo<SessionValue>(() => {
    return {
      user,
      loading,
      remainingMs: user ? SESSION_IDLE_MS - (clock - lastActivity) : SESSION_IDLE_MS,
      async login(identifiant, password) {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifiant, password }),
        });
        const me = await api<{ user: SessionUser }>("/api/auth/me");
        setUser(me.user);
        setLastActivity(Date.now());
        setClock(Date.now());
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST", body: "{}" });
        setUser(null);
      },
      async stay() {
        await api("/api/session/ping", { method: "POST", body: "{}" });
        const at = Date.now();
        setLastActivity(at);
        setClock(at);
      },
    };
  }, [clock, lastActivity, loading, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("SessionProvider manquant");
  }
  return value;
}
