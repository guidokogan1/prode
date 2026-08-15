"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import { ALLOCATION_EVENT, buildAllocationScope } from "@/lib/local-store";
import { countUnconfirmedPicks, retryUnconfirmedPicks } from "@/lib/pick-save";

const POLL_INTERVAL_MS = 5000;

export function UnconfirmedPicksBanner() {
  const router = useRouter();
  const session = useContext(SessionContext);
  const [count, setCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const allocationScope = buildAllocationScope(session);

  useEffect(() => {
    if (session?.kind !== "remote") {
      setCount(0);
      return;
    }

    const refresh = () => setCount(countUnconfirmedPicks(allocationScope));

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener(ALLOCATION_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener(ALLOCATION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [allocationScope, session]);

  if (!count) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        display: "grid",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(244,166,60,0.12)",
        border: "1px solid rgba(244,166,60,0.4)",
      }}
    >
      <strong style={{ color: "var(--live)", fontSize: ".92rem" }}>
        {count === 1 ? "1 jugada no llegó al servidor" : `${count} jugadas no llegaron al servidor`}
      </strong>
      <span className="micro-copy">
        Están guardadas en este teléfono, pero todavía no cuentan para la tabla.
      </span>
      <button
        className="button-secondary"
        disabled={isRetrying}
        onClick={() => {
          setIsRetrying(true);
          void retryUnconfirmedPicks(allocationScope)
            .then(() => setCount(countUnconfirmedPicks(allocationScope)))
            .finally(() => {
              setIsRetrying(false);
              router.refresh();
            });
        }}
        style={{ minHeight: 38 }}
      >
        {isRetrying ? "Reintentando…" : "Reintentar ahora"}
      </button>
    </div>
  );
}
