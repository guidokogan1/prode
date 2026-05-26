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
    <main className="page-narrow home-playground">
      <section className="home-shell">
        <div className="home-shell-header">
          <div className="home-brand">
            <span className="home-brand-ball">⚽</span>
            <span className="home-brand-label">Mundial 26</span>
          </div>
          <div className="home-shell-side">
            {queueRemaining ? (
              <span className="home-badge">{queueRemaining} sin jugar</span>
            ) : null}
            <span className="home-avatar">{me?.name?.slice(0, 1) ?? "V"}</span>
          </div>
        </div>

        <div className="home-intro">
          <div>
            <p className="eyebrow">Jugada rápida</p>
            <h1 className="home-intro-title">¿Qué sale?</h1>
            <p className="home-intro-copy">Deslizá o tocá. Elegís el resultado y seguís al próximo.</p>
          </div>
          <div className="home-queue-pills">
            <span className="home-queue-pill">
              <strong>{summary.liveMatches}</strong>
              <span>live</span>
            </span>
            <span className="home-queue-pill">
              <strong>{summary.yourNet}</strong>
              <span>tu tabla</span>
            </span>
          </div>
        </div>

        <QuickPlayDeck matches={featuredMatches} />

        <div className="home-footer-stack">
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
    </main>
  );
}
