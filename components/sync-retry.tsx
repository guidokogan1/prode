"use client";

import { useContext, useEffect, useRef } from "react";
import { SessionContext } from "@/components/session-provider";
import { buildAllocationScope } from "@/lib/local-store";
import { countUnconfirmedPicks, retryUnconfirmedPicks } from "@/lib/pick-save";

const RETRY_INTERVAL_MS = 20000;

export function SyncRetry() {
  const session = useContext(SessionContext);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (session?.kind !== "remote") {
      return;
    }

    const allocationScope = buildAllocationScope(session);
    let cancelled = false;

    const sync = async () => {
      if (cancelled || inFlightRef.current) {
        return;
      }
      if (!countUnconfirmedPicks(allocationScope)) {
        return;
      }

      inFlightRef.current = true;
      try {
        await retryUnconfirmedPicks(allocationScope);
      } finally {
        inFlightRef.current = false;
      }
    };

    void sync();

    const interval = setInterval(() => void sync(), RETRY_INTERVAL_MS);
    const onWake = () => void sync();
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [session]);

  return null;
}
