"use client";

import { useContext, useEffect, useRef } from "react";
import { SessionContext } from "@/components/session-provider";
import {
  buildAllocationScope,
  listAllStoredAllocations,
  listSyncErrorAllocations,
  saveStoredAllocation,
} from "@/lib/local-store";

export function SyncRetry() {
  const session = useContext(SessionContext);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (session?.kind !== "remote") return;
    ranRef.current = true;

    const allocationScope = buildAllocationScope(session);
    const sync = async () => {
      const errored = listSyncErrorAllocations(allocationScope);
      const all = new Map<string, (typeof errored)[number]>();
      for (const item of errored) all.set(item.matchId, item);

      if (!all.size) return;

      await Promise.all(
        Array.from(all.values()).map(async ({ matchId, draft }) => {
          try {
            const response = await fetch("/api/tickets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ matchId, allocations: draft.allocations }),
              credentials: "include",
            });
            if (response.ok) {
              saveStoredAllocation(allocationScope, matchId, {
                ...draft,
                status: "saved_remote",
                savedAt: new Date().toISOString(),
              });
            }
          } catch {
          }
        }),
      );
    };

    void sync();
  }, [session]);

  return null;
}
