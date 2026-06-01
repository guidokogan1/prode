import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { LiveSocialBoard } from "@/components/live-social-board";
import { MatchOverview } from "@/components/match-overview";
import { MatchVoteCard } from "@/components/match-vote-card";
import { getMatchById } from "@/lib/repositories/matches";
import {
  deriveResolvedOutcome,
  getOutcomeColor,
  getOutcomeFlag,
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

  const resolvedOutcome = deriveResolvedOutcome(match);

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <MatchOverview match={match} />

      {match.isEditable ? <MatchVoteCard match={match} /> : <AllocationCard match={match} />}

      {match.revealedTickets.length > 0 ? (
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
