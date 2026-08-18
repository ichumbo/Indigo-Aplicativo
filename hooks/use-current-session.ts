import { useCallback, useEffect, useState } from "react";

import { UserSession, getCurrentSession } from "@/services/auth-store";

export function useCurrentSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const nextSession = await getCurrentSession();
      setSession(nextSession);
      return nextSession;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  return {
    session,
    loadingSession,
    refreshSession,
  };
}
