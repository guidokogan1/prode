import { MatchCard } from "@/components/match-card";
import { listMatchesByStage } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const matchesByStage = await listMatchesByStage();

  return (
    <main className="stack page-mid">
      <section className="section-title">
        <div>
          <p className="eyebrow">Fixture</p>
          <h1 className="page-title">Partidos y jugadas</h1>
        </div>
        <p className="subtle">Mundial 2026 · mobile first</p>
      </section>

      {matchesByStage.map((group) => (
        <section className="stack" key={group.stage}>
          <div className="section-title">
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
