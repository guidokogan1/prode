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
    <main className="page-shell page-scroll section-stack-lg">
      {resolvedOutcome ? <MatchSettledSummary match={match} /> : <MatchOverview match={match} />}

      {match.isEditable ? <MatchVoteCard match={match} /> : <AllocationCard match={match} />}

      {match.revealedTickets.length > 0 ? (
        <LiveSocialBoard match={match} />
      ) : (
        <section className="surface-card-soft soft-panel section-stack-lg">
          <div className="title-stack">
            <p className="eyebrow">Forma</p>
            <h2 className="section-title">Llegan así</h2>
          </div>
          <div className="compact-grid-2">
            <div className="surface-card-soft soft-panel-md">
              <span className="micro-copy">{match.home.flag} {match.home.name}</span>
              <strong style={{ display: "block", marginTop: 6 }}>{match.form.home}</strong>
              <span className="micro-copy">{match.form.homeGoals} goles recientes</span>
            </div>
            <div className="surface-card-soft soft-panel-md">
              <span className="micro-copy">{match.away.flag} {match.away.name}</span>
              <strong style={{ display: "block", marginTop: 6 }}>{match.form.away}</strong>
              <span className="micro-copy">{match.form.awayGoals} goles recientes</span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
