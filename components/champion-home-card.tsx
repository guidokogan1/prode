"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "@/components/session-provider";
import type { SessionState } from "@/lib/domain";
import { CHAMPION_EVENT, getStoredChampionPick } from "@/lib/local-store";

function buildChampionScope(session: SessionState | null) {
  if (session?.kind === "demo") {
    return `demo:${session.demoPersonaSlug ?? "default"}`;
  }

  if (session?.kind === "local") {
    return `local:${session.displayName ?? "guest"}`;
  }

  return null;
}

export function ChampionHomeCard() {
  const session = useContext(SessionContext);
  const [isVisible, setIsVisible] = useState(true);
  const localScope = useMemo(() => buildChampionScope(session), [session]);

  useEffect(() => {
    if (!localScope) {
      setIsVisible(true);
      return;
    }

    const sync = () => {
      const stored = getStoredChampionPick(localScope);
      setIsVisible(!stored?.teamName);
    };

    sync();
    window.addEventListener(CHAMPION_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CHAMPION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [localScope]);

  if (!isVisible) {
    return null;
  }

  return (
    <section
      className="surface-card"
      style={{
        minHeight: 212,
        padding: 16,
        display: "grid",
        alignContent: "space-between",
        gap: 14,
        background: "linear-gradient(180deg, rgba(18,25,35,0.98) 0%, rgba(11,16,22,0.98) 100%)",
      }}
    >
      <div className="section-stack" style={{ gap: 12 }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <span className="status-pill status-pill-gold" style={{ minHeight: 28, paddingInline: 10 }}>Pendiente</span>
          <span className="micro-copy">Se cierra en la fecha 4</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Campeón</p>
            <h2 className="display-title" style={{ fontSize: "clamp(1.6rem, 6vw, 2rem)" }}>
              Elegí quién lo gana
            </h2>
            <p className="muted-copy">Una sola vez. Lo podés cambiar hasta la fecha 4.</p>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(160deg, rgba(63,227,242,0.16) 0%, rgba(63,227,242,0.04) 100%)",
              border: "1px solid rgba(63,227,242,0.14)",
              fontSize: "1.5rem",
            }}
          >
            🏆
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="split-row">
          <span className="micro-copy">Apuesta larga</span>
          <span className="micro-copy">Antes de la fecha 4</span>
        </div>
        <Link className="button-primary" href="/champion">
          Elegir campeón
        </Link>
      </div>
    </section>
  );
}
