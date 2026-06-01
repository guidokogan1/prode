"use client";

import { createContext, useEffect, useState } from "react";
import type { SessionState } from "@/lib/domain";
import { getStoredSession, SESSION_EVENT } from "@/lib/local-store";

export const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncLocal = (baseAppMode: SessionState["appMode"] = "demo", demoPersonaSlug?: string) => {
      const localSession = getStoredSession();
      setSession(
        localSession
          ? {
              kind: "local",
              appMode: baseAppMode,
              displayName: localSession.displayName,
              demoPersonaSlug,
            }
          : {
              kind: "anonymous",
              appMode: baseAppMode,
              displayName: null,
              demoPersonaSlug,
            },
      );
    };

    const syncSession = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as { session: SessionState };

        if (!mounted) {
          return;
        }

        if (payload.session.kind === "anonymous") {
          syncLocal(payload.session.appMode, payload.session.demoPersonaSlug);
          return;
        }

        setSession(payload.session);
      } catch {
        if (mounted) {
          syncLocal();
        }
      }
    };

    const handleSessionChanged = () => {
      void syncSession();
    };

    void syncSession();
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
