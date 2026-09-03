import { useCallback, useEffect, useState } from "react";
import { UserSession, getCurrentSession } from "@/services/auth-store";

// Cache em memória para evitar tela branca e flashes ao trocar de abas
let inMemorySession: UserSession | null = null;
let sessionInitialized = false;
let pendingFetchPromise: Promise<UserSession | null> | null = null;
const listeners = new Set<(s: UserSession | null) => void>();

export function notifySessionChanged(newSession: UserSession | null) {
  inMemorySession = newSession;
  sessionInitialized = true;
  listeners.forEach((listener) => {
    try {
      listener(newSession);
    } catch {
      // Ignora erro de componente desmontado
    }
  });
}

export function useCurrentSession() {
  const [session, setSession] = useState<UserSession | null>(inMemorySession);
  const [loadingSession, setLoadingSession] = useState(!sessionInitialized);

  const refreshSession = useCallback(async () => {
    if (!sessionInitialized) {
      setLoadingSession(true);
    }
    try {
      if (!pendingFetchPromise) {
        pendingFetchPromise = getCurrentSession().finally(() => {
          pendingFetchPromise = null;
        });
      }
      const nextSession = await pendingFetchPromise;
      notifySessionChanged(nextSession);
      return nextSession;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = (updated: UserSession | null) => {
      setSession(updated);
      setLoadingSession(false);
    };
    listeners.add(handleUpdate);

    if (!sessionInitialized) {
      void refreshSession();
    } else {
      setSession(inMemorySession);
      setLoadingSession(false);
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, [refreshSession]);

  return {
    session,
    loadingSession,
    refreshSession,
  };
}
