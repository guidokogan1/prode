"use client";

import { createContext, useEffect, useState } from "react";
import { getStoredSession, SESSION_EVENT } from "@/lib/local-store";

export type AppSession = {
  userId?: string;
  displayName: string;
  mode: "local" | "remote" | "demo";
};

export const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncLocal = () => {
      const localSession = getStoredSession();
      setSession(
        localSession
          ? {
              displayName: localSession.displayName,
              mode: "local",
            }
          : null,
      );
    };

    const syncRemote = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as { session: AppSession | null };

        if (!mounted) {
          return;
        }

        if (payload.session && payload.session.mode !== "demo") {
          setSession(payload.session);
          return;
        }
      } catch {
        // Falls back below.
      }

      if (mounted) {
        syncLocal();
      }
    };

    const handleSessionChanged = () => {
      void syncRemote();
    };

    void syncRemote();
    window.addEventListener(SESSION_EVENT, handleSessionChanged);
    window.addEventListener("storage", handleSessionChanged);

    return () => {
      mounted = false;
      window.removeEventListener(SESSION_EVENT, handleSessionChanged);
      window.removeEventListener("storage", handleSessionChanged);
    };
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
