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
          <p className="home-subtitle">10.000 créditos. Cierra al arranque.</p>
        </div>
        <div className="home-status-row">
          <span className="home-status-pill">
            <strong>{summary.pendingPicks}</strong>
            <span>sin jugar</span>
          </span>
          <span className="home-status-pill">
            <strong>{summary.liveMatches}</strong>
            <span>en juego</span>
          </span>
          <span className="home-status-pill">
            <strong>{summary.yourNet}</strong>
            <span>tu tabla</span>
          </span>
        </div>
      </section>

      <QuickPlayDeck matches={featuredMatches} />

      <section className="stack">
        <div className="section-title section-title-compact">
          <h2>Después</h2>
          <Link className="subtle" href="/matches">
            Ver todos
          </Link>
        </div>
        <div className="list compact-list">
          {featuredMatches.slice(0, 1).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="section-title section-title-compact">
          <h2>Tabla</h2>
          <Link className="subtle" href="/ranking">
            Abrir
          </Link>
        </div>
        <RankingList items={leaderboardPreview.slice(0, 2)} compact />
      </section>
    </main>
  );
}
