import Link from "next/link";
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
    <main className="stack page-narrow home-main">
      <section className="home-head home-head-game">
        <div>
          <p className="eyebrow">Jugá de una</p>
          <h1 className="home-title">Swipe y seguí</h1>
        </div>
        <div className="home-status-row home-status-row-minimal">
          <span className="home-status-pill">
            <strong>{summary.pendingPicks}</strong>
            <span>pendientes</span>
          </span>
          <span className="home-status-pill">
            <strong>{summary.liveMatches}</strong>
            <span>vivos</span>
          </span>
          <span className="home-status-pill">
            <strong>{summary.yourNet}</strong>
            <span>tu tabla</span>
          </span>
        </div>
      </section>

      <QuickPlayDeck matches={featuredMatches} />

      <section className="home-secondary-strip">
        <Link className="card home-shortcut-card" href="/matches">
          <strong>Modo maratón</strong>
          <span>Cargá grupos de corrido</span>
        </Link>
        <Link className="card home-shortcut-card" href="/ranking">
          <strong>Tabla</strong>
          <span>Mirá quién pica arriba</span>
        </Link>
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
