import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { LiveSocialBoard } from "@/components/live-social-board";
import { MatchOverview } from "@/components/match-overview";
import { MatchSettledSummary } from "@/components/match-settled-summary";
import { MatchVoteCard } from "@/components/match-vote-card";
import { getMatchById } from "@/lib/repositories/matches";
import {
  deriveResolvedOutcome,
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
      {resolvedOutcome ? <MatchSettledSummary match={match} /> : <MatchOverview match={match} />}

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

    </main>
  );
}
