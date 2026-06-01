import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { LiveSocialBoard } from "@/components/live-social-board";
import { formatCredits } from "@/lib/format";
import { getMatchById } from "@/lib/repositories/matches";
import {
  deriveResolvedOutcome,
  getLeadingOutcome,
  getMatchStateLabel,
  getOutcomeColor,
  getOutcomeFlag,
  getOutcomeHint,
  getPickStateLabel,
} from "@/lib/match-ui";

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const match = await getMatchById(id);

  if (!match) {
    notFound();
  }

  const isReveal = match.revealedTickets.length > 0;
  const resolvedOutcome = deriveResolvedOutcome(match);
  const leadingConsensus = [...match.consensus].sort((left, right) => right.percentage - left.percentage)[0] ?? null;
  const leadingAllocation = getLeadingOutcome(match);
  const heroBackground =
    match.statusVariant === "live"
      ? "radial-gradient(ellipse 120% 50% at 50% 0%, #2A1010 0%, #091409 50%)"
      : isReveal
        ? "radial-gradient(ellipse 140% 60% at 50% 0%, rgba(61,155,95,.18) 0%, #091409 55%)"
        : "linear-gradient(180deg, rgba(12,24,15,.9) 0%, rgba(9,20,9,1) 100%)";

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, background: heroBackground }}>
      <section
        className={match.statusVariant === "live" || isReveal ? "surface-card-strong" : "surface-card"}
        style={{
          padding: 22,
          background:
            match.statusVariant === "live"
              ? "linear-gradient(160deg, #2A1818 0%, #1A1010 100%)"
              : isReveal
                ? "linear-gradient(160deg, #173021 0%, #0E1D13 100%)"
                : undefined,
          borderColor:
            match.statusVariant === "live"
              ? "rgba(255,59,48,0.2)"
              : resolvedOutcome
                ? `${getOutcomeColor(resolvedOutcome)}30`
                : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 18 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {match.statusVariant === "live" ? <span className="status-pill status-pill-live">{getMatchStateLabel(match)}</span> : <span className="pill">{getMatchStateLabel(match)}</span>}
              <span className="pill">{getPickStateLabel(match)}</span>
              <span className="pill">{match.stage}</span>
            </div>
            <span className="muted-copy">{match.kickoffLabel} · {match.venue}</span>
          </div>
          {!isReveal && leadingConsensus ? (
            <span className="status-pill status-pill-gold">
              {leadingConsensus.shortLabel} {leadingConsensus.percentage}%
            </span>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <span style={{ fontSize: "3.7rem", lineHeight: 1 }}>{match.home.flag}</span>
            <span className="team-display" style={{ textAlign: "center" }}>{match.home.name}</span>
          </div>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <strong className="score-display">{match.home.score} - {match.away.score}</strong>
            <span className="micro-copy">{isReveal ? "Se abrió la ronda" : match.marketTypeLabel}</span>
          </div>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <span style={{ fontSize: "3.7rem", lineHeight: 1 }}>{match.away.flag}</span>
            <span className="team-display" style={{ textAlign: "center" }}>{match.away.name}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <div className="surface-card-soft" style={{ padding: "14px 16px", borderRadius: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 3 }}>
              <span className="micro-copy">Tu jugada</span>
              <strong style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{leadingAllocation?.label ?? "Sin jugar"}</strong>
            </div>
            {leadingAllocation ? (
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", color: getOutcomeColor(leadingAllocation.code), letterSpacing: "-0.04em" }}>
                  {formatCredits(leadingAllocation.amount)}
                </strong>
                <div className="micro-copy">{getOutcomeHint(leadingAllocation.code, match.marketType)}</div>
              </div>
            ) : null}
          </div>

          {!isReveal ? (
            <div className="surface-card-soft" style={{ padding: "14px 16px", borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                {match.consensus.map((item) => (
                  <div key={item.code} style={{ display: "grid", gap: 4, minWidth: 82 }}>
                    <span className="micro-copy">{item.label}</span>
                    <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-accent)", fontSize: "1.16rem", letterSpacing: "-0.04em" }}>{item.percentage}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <AllocationCard match={match} />

      {isReveal ? (
        <LiveSocialBoard match={match} />
      ) : (
        <section className="surface-card-soft" style={{ padding: 18 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <p className="eyebrow">Forma</p>
              <h2 className="section-title">Antes de cerrar</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div className="surface-card-soft" style={{ padding: 14, borderRadius: 16 }}>
                <span className="micro-copy">{match.home.flag} {match.home.name}</span>
                <strong style={{ display: "block", marginTop: 6 }}>{match.form.home}</strong>
                <span className="micro-copy">Goles recientes: {match.form.homeGoals}</span>
              </div>
              <div className="surface-card-soft" style={{ padding: 14, borderRadius: 16 }}>
                <span className="micro-copy">{match.away.flag} {match.away.name}</span>
                <strong style={{ display: "block", marginTop: 6 }}>{match.form.away}</strong>
                <span className="micro-copy">Goles recientes: {match.form.awayGoals}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {resolvedOutcome ? (
        <section
          className="surface-card-soft"
          style={{
            padding: 16,
            borderRadius: 20,
            background: `${getOutcomeColor(resolvedOutcome)}12`,
            borderColor: `${getOutcomeColor(resolvedOutcome)}30`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.8rem" }}>{getOutcomeFlag(resolvedOutcome, match)}</span>
            <div style={{ display: "grid", gap: 4 }}>
              <span className="micro-copy">Outcome ganador</span>
              <strong style={{ color: getOutcomeColor(resolvedOutcome) }}>
                {match.consensus.find((item) => item.code === resolvedOutcome)?.label ?? "Resultado"}
              </strong>
            </div>
          </div>
          <span className="pill">Liquidado</span>
        </section>
      ) : null}
    </main>
  );
}
