"use client";

import { useState } from "react";
import { ChampionHomeCard } from "@/components/champion-home-card";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import type { HomeSummary, MatchViewModel } from "@/lib/domain";
import { formatNetAmount } from "@/lib/format";

type HomePageClientProps = {
  initialSummary: HomeSummary;
  featuredMatches: MatchViewModel[];
  needsChampionPick: boolean;
};

export function HomePageClient({
  initialSummary,
  featuredMatches,
  needsChampionPick,
}: HomePageClientProps) {
  const [pendingPicks, setPendingPicks] = useState(initialSummary.pendingPicks);

  const headline = pendingPicks > 0 ? `${pendingPicks} por jugar` : "Todo al dia";

  return (
    <>
      <section style={{ display: "grid", gap: 14 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack" style={{ gap: 6 }}>
            <p className="eyebrow">Hoy en el pool</p>
            <h1 className="display-title" style={{ maxWidth: 200 }}>{headline}</h1>
            <p className="micro-copy" style={{ maxWidth: 220 }}>
              Live, pendientes y tu neto en una sola vista.
            </p>
          </div>
          <div
            className="surface-card-soft"
            style={{
              padding: 10,
              borderRadius: 12,
              minWidth: 86,
              display: "grid",
              gap: 2,
              background: "linear-gradient(180deg, rgba(216,255,86,0.1) 0%, rgba(255,255,255,0.03) 100%)",
              alignContent: "start",
            }}
          >
            <span className="micro-copy" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>Neto</span>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.3rem", letterSpacing: "-0.04em", color: "var(--gold)" }}>
              {formatNetAmount(initialSummary.yourNetAmount)}
            </strong>
          </div>
        </div>

        <div className="compact-grid-2">
          <div className="surface-card-soft" style={{ padding: 12, borderRadius: 12, display: "grid", gap: 4, background: "rgba(255,255,255,0.03)" }}>
            <span className="micro-copy" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>En vivo</span>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.04em", color: "var(--live)" }}>
              {initialSummary.liveMatches}
            </strong>
            <span className="micro-copy">Activos ahora</span>
          </div>
          <div className="surface-card-soft" style={{ padding: 12, borderRadius: 12, display: "grid", gap: 4, background: "rgba(255,255,255,0.03)" }}>
            <span className="micro-copy" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>Pendientes</span>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.04em" }}>
              {pendingPicks}
            </strong>
            <span className="micro-copy">Por jugar</span>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 20, minHeight: 0 }}>
        {needsChampionPick ? (
          <ChampionHomeCard />
        ) : (
          <QuickPlayDeck
            matches={featuredMatches}
            onMatchSaved={() => {
              setPendingPicks((current) => Math.max(0, current - 1));
            }}
            onPendingCountChange={(count) => {
              setPendingPicks(count);
            }}
          />
        )}
      </div>
    </>
  );
}
