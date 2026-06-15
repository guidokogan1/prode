"use client";

import { useState } from "react";
import { ChampionHomeCard } from "@/components/champion-home-card";
import { MatchCard } from "@/components/match-card";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import type { HomeSummary, MatchViewModel } from "@/lib/domain";
import { formatGross } from "@/lib/format";

type HomePageClientProps = {
  initialSummary: HomeSummary;
  featuredMatches: MatchViewModel[];
  todayMatches: MatchViewModel[];
  nextDayMatches: MatchViewModel[];
  nextDayLabel: string | null;
  dayAfterMatches: MatchViewModel[];
  dayAfterLabel: string | null;
  needsChampionPick: boolean;
};

type DaySectionProps = {
  title: string;
  subtitle: string | null;
  matches: MatchViewModel[];
};

function DaySection({ title, subtitle, matches }: DaySectionProps) {
  return (
    <section style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <span className="micro-copy">{subtitle}</span> : null}
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <span className="pill">{matches.length} {matches.length === 1 ? "partido" : "partidos"}</span>
      </div>

      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}

export function HomePageClient({
  initialSummary,
  featuredMatches,
  todayMatches,
  nextDayMatches,
  nextDayLabel,
  dayAfterMatches,
  dayAfterLabel,
  needsChampionPick,
}: HomePageClientProps) {
  const [pendingPicks, setPendingPicks] = useState(initialSummary.pendingPicks);

  const hasTodayMatches = todayMatches.length > 0;
  const hasNextDayMatches = nextDayMatches.length > 0;
  const hasDayAfterMatches = dayAfterMatches.length > 0;

  const eyebrow =
    pendingPicks === 0 && !hasTodayMatches && hasNextDayMatches
      ? "Próximos partidos"
      : "Hoy en el pool";

  const headline =
    pendingPicks > 0
      ? `${pendingPicks} por jugar`
      : hasTodayMatches
        ? "Hoy se juega"
        : hasNextDayMatches && nextDayLabel
          ? nextDayLabel
          : "Sin partidos por ahora";

  const showStats = pendingPicks > 0;

  return (
    <>
      <section style={{ display: "grid", gap: 14 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack" style={{ gap: 6 }}>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display-title">{headline}</h1>
            {showStats ? (
              <p className="micro-copy" style={{ maxWidth: 220 }}>
                Live, pendientes y tu total en una sola vista.
              </p>
            ) : null}
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
            <span className="micro-copy" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>Total</span>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.3rem", letterSpacing: "-0.04em", color: initialSummary.yourGrossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>
              {formatGross(initialSummary.yourGrossAmount)}
            </strong>
          </div>
        </div>

        {showStats ? (
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
        ) : null}
      </section>

      <div style={{ display: "grid", gap: 18, alignContent: "start", minHeight: 0 }}>
        {needsChampionPick ? <ChampionHomeCard /> : null}

        {pendingPicks > 0 ? (
          <QuickPlayDeck
            matches={featuredMatches}
            onMatchSaved={() => {
              setPendingPicks((current) => Math.max(0, current - 1));
            }}
            onPendingCountChange={(count) => {
              setPendingPicks(count);
            }}
          />
        ) : null}

        {hasTodayMatches ? (
          <DaySection title="Partidos del día" subtitle={null} matches={todayMatches} />
        ) : null}

        {hasNextDayMatches ? (
          <DaySection
            title={hasTodayMatches ? "Próximos partidos" : "Próximo día"}
            subtitle={nextDayLabel}
            matches={nextDayMatches}
          />
        ) : null}

        {hasDayAfterMatches ? (
          <DaySection
            title="Día siguiente"
            subtitle={dayAfterLabel}
            matches={dayAfterMatches}
          />
        ) : null}
      </div>
    </>
  );
}
