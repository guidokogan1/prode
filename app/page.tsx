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
          <p className="eyebrow">Abrí y jugá</p>
          <h1 className="home-title">¿Qué sale?</h1>
          <p className="home-subtitle">Deslizá o tocá. Después elegís cuánto.</p>
        </div>
        <div className="home-status-row home-status-row-minimal">
          <span className="home-status-pill">
            <strong>{summary.pendingPicks}</strong>
            <span>pendientes</span>
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
          <h2>Seguí después</h2>
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
          <h2>Top 2</h2>
          <Link className="subtle" href="/ranking">
            Abrir
          </Link>
        </div>
        <RankingList items={leaderboardPreview.slice(0, 2)} compact />
      </section>
    </main>
  );
}
