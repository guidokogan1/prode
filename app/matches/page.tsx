import { MatchCard } from "@/components/match-card";
import { getHomeSummary } from "@/lib/repositories/home";
import { listMatchesByStage } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const [matchesByStage, summary] = await Promise.all([listMatchesByStage(), getHomeSummary()]);

  return (
    <main className="stack page-narrow">
      <section className="section-title section-title-compact match-list-head">
        <div>
          <p className="eyebrow">Modo maratón</p>
          <h1 className="page-title">Cargá grupos</h1>
        </div>
        <div className="home-status-row home-status-row-minimal">
          <span className="home-status-pill">
            <strong>{summary.pendingPicks}</strong>
            <span>por jugar</span>
          </span>
        </div>
      </section>

      {matchesByStage.map((group) => (
        <section className="stack" key={group.stage}>
          <div className="section-title section-title-compact">
            <div>
              <p className="eyebrow">{group.label}</p>
              <h2>{group.stage}</h2>
            </div>
            <span className="subtle">{group.matches.length} partidos</span>
          </div>
          <div className="list">
            {group.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
