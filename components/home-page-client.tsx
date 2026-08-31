"use client";

import { useState } from "react";
import { ChampionHomeCard } from "@/components/champion-home-card";
import { MatchCard } from "@/components/match-card";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import type { HomeSummary, MatchViewModel } from "@/lib/domain";
import { formatGross } from "@/lib/format";

type HomePageClientProps = {
  initialSummary: HomeSummary;
  nearPendingMatches: MatchViewModel[];
  todayMatches: MatchViewModel[];
  nextDayMatches: MatchViewModel[];
  nextDayLabel: string | null;
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
  nearPendingMatches,
  todayMatches,
  nextDayMatches,
  nextDayLabel,
  needsChampionPick,
}: HomePageClientProps) {
  const [pendingCount, setPendingCount] = useState(nearPendingMatches.length);

  const hasTodayMatches = todayMatches.length > 0;
  const hasNextDayMatches = nextDayMatches.length > 0;

  return (
    <>
      <section style={{ display: "grid", gap: 14 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack" style={{ gap: 6 }}>
            <p className="eyebrow">Hoy en el pool</p>
            <h1 className="display-title">Hoy</h1>
            <p className="micro-copy" style={{ maxWidth: 220 }}>
              {pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? "partido" : "partidos"} por cargar esta semana.`
                : "Estás al día, nada pendiente por ahora."}
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
              background: "linear-gradient(180deg, rgba(63,227,242,0.1) 0%, rgba(255,255,255,0.03) 100%)",
              alignContent: "start",
            }}
          >
            <span className="micro-copy" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>Total</span>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.3rem", letterSpacing: "-0.04em", color: initialSummary.yourGrossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>
              {formatGross(initialSummary.yourGrossAmount)}
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
              {pendingCount}
            </strong>
            <span className="micro-copy">Próximos 7 días</span>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 18, alignContent: "start", minHeight: 0 }}>
        {needsChampionPick ? <ChampionHomeCard /> : null}

        {pendingCount > 0 ? (
          <QuickPlayDeck
            matches={nearPendingMatches}
            onMatchSaved={() => {
              setPendingCount((current) => Math.max(0, current - 1));
            }}
            onPendingCountChange={(count) => {
              setPendingCount(count);
            }}
          />
        ) : null}

        {hasTodayMatches ? (
          <DaySection title="Hoy" subtitle={null} matches={todayMatches} />
        ) : null}

        {hasNextDayMatches ? (
          <DaySection title="Mañana" subtitle={nextDayLabel} matches={nextDayMatches} />
        ) : null}
      </div>
    </>
  );
}
