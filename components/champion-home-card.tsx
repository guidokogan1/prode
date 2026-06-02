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
        minHeight: 248,
        padding: 22,
        display: "grid",
        alignContent: "space-between",
        gap: 18,
        background: "linear-gradient(160deg, #24452c 0%, #102018 100%)",
      }}
    >
      <div className="section-stack" style={{ gap: 14 }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <span className="status-pill status-pill-gold" style={{ minHeight: 28, paddingInline: 10 }}>Pendiente</span>
          <span className="micro-copy">Se cierra al inicio</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Campeón</p>
            <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.8rem)" }}>
              Elegí quién lo gana
            </h2>
            <p className="muted-copy">Lo hacés una vez y queda fijo.</p>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(160deg, rgba(212,166,75,0.22) 0%, rgba(212,166,75,0.08) 100%)",
              border: "1px solid rgba(212,166,75,0.16)",
              boxShadow: "0 18px 38px rgba(0,0,0,0.26)",
              fontSize: "2rem",
            }}
          >
            🏆
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="split-row">
          <span className="micro-copy">Apuesta larga</span>
          <span className="micro-copy">Antes del 11 Jun</span>
        </div>
        <Link className="button-primary" href="/champion">
          Elegir campeón
        </Link>
      </div>
    </section>
  );
}
