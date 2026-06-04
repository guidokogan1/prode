"use client";

import { useState } from "react";
import { ChampionHomeCard } from "@/components/champion-home-card";
import { MatchCard } from "@/components/match-card";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import type { HomeSummary, MatchViewModel } from "@/lib/domain";
import { getDummyHomeSectionTitle } from "@/lib/dummy-matches";
import { formatNetAmount } from "@/lib/format";

type HomePageClientProps = {
  initialSummary: HomeSummary;
  featuredMatches: MatchViewModel[];
  dummyMatches: MatchViewModel[];
  needsChampionPick: boolean;
};

export function HomePageClient({
  initialSummary,
  featuredMatches,
  dummyMatches,
  needsChampionPick,
}: HomePageClientProps) {
  const [pendingPicks, setPendingPicks] = useState(initialSummary.pendingPicks);

  const headline = pendingPicks > 0 ? `${pendingPicks} por jugar` : "Todo al día";

  return (
    <>
      <section className="section-stack">
        <div className="section-stack">
          <div className="title-stack">
            <p className="eyebrow">Inicio</p>
            <h1 className="display-title">{headline}</h1>
          </div>
          <div className="metric-chip-row">
            <div className="surface-card-soft metric-chip">
              <strong style={{ display: "block", fontFamily: "var(--font-accent)", fontSize: "1rem", letterSpacing: "-0.04em" }}>
                {initialSummary.liveMatches}
              </strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>
                En vivo
              </span>
            </div>
            <div className="surface-card-soft metric-chip">
              <strong style={{ display: "block", fontFamily: "var(--font-accent)", fontSize: "1rem", color: "#D8B56A", letterSpacing: "-0.04em" }}>
                {formatNetAmount(initialSummary.yourNetAmount)}
              </strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>
                Tabla
              </span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 12, minHeight: 0 }}>
        {dummyMatches.length ? (
          <section className="surface-card-soft" style={{ padding: 16, borderRadius: 22, display: "grid", gap: 12 }}>
            <div className="split-row" style={{ alignItems: "end", gap: 12 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <p className="eyebrow">{getDummyHomeSectionTitle()}</p>
                <h2 className="section-title">Grupo X</h2>
              </div>
              <span className="micro-copy">{dummyMatches.length} partidos</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {dummyMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        ) : null}

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
