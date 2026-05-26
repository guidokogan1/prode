import Link from "next/link";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import { getHomeSummary, getLeaderboardPreview, getMatchesForHome } from "@/lib/repositories/home";

export default async function HomePage() {
  const [summary, featuredMatches, leaderboardPreview] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getLeaderboardPreview(),
  ]);
  const liveMatch = featuredMatches.find((match) => match.status === "live") ?? null;
  const queueRemaining = summary.pendingPicks;
  const me = leaderboardPreview.find((entry) => entry.name === "Vos") ?? leaderboardPreview[0] ?? null;

  return (
    <main className="stack page-narrow home-main">
      <section className="home-screen-shell">
        <div className="home-screen-header">
          <div className="home-brand">
            <span className="home-brand-ball">⚽</span>
            <span className="home-brand-label">Mundial 26</span>
          </div>
          <div className="home-screen-header-side">
            {queueRemaining ? (
              <span className="home-header-badge">{queueRemaining} sin jugar</span>
            ) : null}
            <span className="home-avatar-pill">{me?.name?.slice(0, 1) ?? "V"}</span>
          </div>
        </div>

        <div className="home-head home-head-game home-head-inside">
          <div>
            <p className="eyebrow">Jugá de una</p>
            <h1 className="home-title home-title-game">Swipe y seguí</h1>
          </div>
          <div className="home-status-row home-status-row-minimal">
            <span className="home-status-pill">
              <strong>{summary.pendingPicks}</strong>
              <span>sin jugar</span>
            </span>
            <span className="home-status-pill">
              <strong>{summary.liveMatches}</strong>
              <span>live</span>
            </span>
            <span className="home-status-pill">
              <strong>{summary.yourNet}</strong>
              <span>tu tabla</span>
            </span>
          </div>
        </div>

        <QuickPlayDeck matches={featuredMatches} />

        <div className="home-bottom-strip">
          <Link className="home-bottom-card" href="/matches">
            <div>
              <strong>Cargá grupos de una</strong>
              <span>Modo maratón</span>
            </div>
            <span className="home-bottom-arrow">→</span>
          </Link>

          {liveMatch ? (
            <Link className="home-bottom-card home-bottom-card-live" href={`/matches/${liveMatch.id}`}>
              <div className="home-live-row">
                <span className="home-live-dot" />
                <span className="home-live-label">Live</span>
                <strong>
                  {liveMatch.home.flag} {liveMatch.home.score} - {liveMatch.away.score} {liveMatch.away.flag}
                </strong>
                <span>{liveMatch.statusLabel}</span>
              </div>
              <span className="home-bottom-arrow home-bottom-arrow-live">ver →</span>
            </Link>
          ) : (
            <Link className="home-bottom-card" href="/ranking">
              <div>
                <strong>Tabla general</strong>
                <span>Mirá quién va arriba</span>
              </div>
              <span className="home-bottom-arrow">→</span>
            </Link>
          )}
        </div>
      </section>

      <section className="home-secondary-strip home-secondary-strip-muted">
        <Link className="card home-shortcut-card" href="/ranking">
          <strong>Tabla</strong>
          <span>Mirá quién pica arriba</span>
        </Link>
        <Link className="card home-shortcut-card" href="/profile">
          <strong>Yo</strong>
          <span>Tu torneo hasta ahora</span>
        </Link>
      </section>
    </main>
  );
}
