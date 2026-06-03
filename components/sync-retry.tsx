"use client";

import { useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import { listSyncErrorAllocations, saveStoredAllocation } from "@/lib/local-store";

export function SyncRetry() {
  const session = useContext(SessionContext);
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (session?.kind !== "remote") return;
    ranRef.current = true;

    const pending = listSyncErrorAllocations();
    if (!pending.length) return;

    void Promise.all(
      pending.map(async ({ matchId, draft }) => {
        try {
          const response = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, allocations: draft.allocations }),
            credentials: "include",
          });
          if (response.ok) {
            saveStoredAllocation(matchId, { ...draft, status: "saved_remote", savedAt: new Date().toISOString() });
          }
        } catch {
        }
      }),
    ).then(() => router.refresh());
  }, [session, router]);

  return null;
}
