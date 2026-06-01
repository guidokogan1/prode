import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { LiveSocialBoard } from "@/components/live-social-board";
import { MatchSummaryCard } from "@/components/match-summary-card";
import { MatchVoteCard } from "@/components/match-vote-card";
import { formatCredits } from "@/lib/format";
import { getMatchById } from "@/lib/repositories/matches";
import {
  deriveResolvedOutcome,
  getLeadingOutcome,
  getOutcomeColor,
  getOutcomeFlag,
  getOutcomeHint,
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

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="section-stack">
        <MatchSummaryCard
          match={match}
          trailing={
            !isReveal && leadingConsensus ? (
              <span className="status-pill status-pill-gold">
                {leadingConsensus.shortLabel} {leadingConsensus.percentage}%
              </span>
            ) : (
              <span className="micro-copy">{match.venue}</span>
            )
          }
        />

        <div className="surface-card-soft soft-panel split-row" style={{ alignItems: "center" }}>
          <div style={{ display: "grid", gap: 3 }}>
            <span className="micro-copy">Tu jugada</span>
            <strong style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{leadingAllocation?.label ?? "Sin jugar"}</strong>
          </div>
          {leadingAllocation ? (
            <div className="text-right">
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", color: getOutcomeColor(leadingAllocation.code), letterSpacing: "-0.04em" }}>
                {formatCredits(leadingAllocation.amount)}
              </strong>
              <div className="micro-copy">{getOutcomeHint(leadingAllocation.code, match.marketType)}</div>
            </div>
          ) : null}
        </div>

        {!isReveal ? (
          <div className="surface-card-soft soft-panel">
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
      </section>

      {match.isEditable ? <MatchVoteCard match={match} /> : <AllocationCard match={match} />}

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
