import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import { RankingList } from "@/components/ranking-list";
import { getHomeSummary, getLeaderboardPreview, getMatchesForHome } from "@/lib/repositories/home";

export default async function HomePage() {
  const [summary, featuredMatches, leaderboardPreview] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getLeaderboardPreview(),
  ]);

  return (
    <main className="stack page-narrow">
      <section className="home-head home-head-game">
        <div>
          <p className="eyebrow">Ronda de hoy</p>
          <h1 className="home-title">Poné tu jugada.</h1>
          <p className="home-subtitle">Repartí 10.000 créditos antes del arranque.</p>
        </div>
        <div className="quick-stats">
          <div className="quick-stat">
            <strong>{summary.pendingPicks}</strong>
            <span>sin jugar</span>
          </div>
          <div className="quick-stat">
            <strong>{summary.liveMatches}</strong>
            <span>en juego</span>
          </div>
          <div className="quick-stat">
            <strong>{summary.yourNet}</strong>
            <span>tu tabla</span>
          </div>
        </div>
      </section>

      <QuickPlayDeck matches={featuredMatches} />

      <section className="round-rules">
        <div className="rule-chip">
          <strong>1</strong>
          <span>Elegís</span>
        </div>
        <div className="rule-chip">
          <strong>2</strong>
          <span>Ajustás</span>
        </div>
        <div className="rule-chip">
          <strong>3</strong>
          <span>Subís</span>
        </div>
      </section>

      <section className="stack">
        <div className="section-title section-title-compact">
          <h2>Más partidos</h2>
          <Link className="subtle" href="/matches">
            Ver todos
          </Link>
        </div>
        <div className="list">
          {featuredMatches.slice(0, 3).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="section-title section-title-compact">
          <h2>Top 3</h2>
          <Link className="subtle" href="/ranking">
            Abrir
          </Link>
        </div>
        <RankingList items={leaderboardPreview.slice(0, 3)} compact />
      </section>
    </main>
  );
}
