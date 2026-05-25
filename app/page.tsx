import { DemoSwitcher } from "@/components/demo-switcher";
import Link from "next/link";
import { SessionSpotlight } from "@/components/session-spotlight";
import { MatchCard } from "@/components/match-card";
import { RankingList } from "@/components/ranking-list";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getDemoPersonas } from "@/lib/mock-data";
import { getHomeSummary, getLeaderboardPreview, getMatchesForHome } from "@/lib/repositories/home";

export default async function HomePage() {
  const [summary, featuredMatches, leaderboardPreview, activePersona] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getLeaderboardPreview(),
    getActiveDemoPersonaSlug(),
  ]);

  return (
    <main className="stack page-wide">
      <section className="card hero-card">
        <div className="stack">
          <span className="eyebrow">Mundial 2026</span>
          <h1 className="page-title">El prode que se juega como un mercado entre amigos.</h1>
          <p className="body-copy">
            Cada partido arranca con 10.000 creditos. Los repartis, se cierra al arranque y gana
            quien mejor lee resultados, riesgo y consenso.
          </p>
          <div className="pill-row">
            <span className="pill pill-live">Live ahora {summary.liveMatches}</span>
            <span className="pill">Sin marcador exacto</span>
            <span className="pill">Reveal al arranque</span>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{summary.pendingPicks}</strong>
            <span>Jugadas pendientes</span>
          </div>
          <div className="hero-stat">
            <strong>{summary.settledToday}</strong>
            <span>Partidos liquidados hoy</span>
          </div>
          <div className="hero-stat">
            <strong>{summary.yourNet}</strong>
            <span>Ganancia acumulada</span>
          </div>
        </div>
      </section>

      <div className="dual-grid">
        <SessionSpotlight />

        <section className="card card-grid">
          <div className="section-title">
            <div>
              <p className="eyebrow">Mercado campeon</p>
              <h2>Tu pick de apertura</h2>
            </div>
            <span className="pill">Cierra antes del debut</span>
          </div>
          <p className="body-copy">
            Elegis al campeon una sola vez. Se liquida al final del torneo y corre por separado
            del juego partido a partido.
          </p>
          <Link className="pill" href="/profile">
            Ver pick actual
          </Link>
        </section>
      </div>

      <DemoSwitcher activePersona={activePersona} personas={getDemoPersonas()} />

      <div className="dual-grid dual-grid-stretch">
        <section className="stack">
          <div className="section-title">
            <div>
              <p className="eyebrow">Hoy</p>
              <h2>Partidos clave</h2>
            </div>
            <Link className="subtle" href="/matches">
              Ver fixture completo
            </Link>
          </div>
          <div className="list">
            {featuredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="stack">
          <div className="section-title">
            <div>
              <p className="eyebrow">Ranking</p>
              <h2>Como viene el grupo</h2>
            </div>
            <Link className="subtle" href="/ranking">
              Abrir tabla
            </Link>
          </div>
          <RankingList items={leaderboardPreview} />
        </section>
      </div>
    </main>
  );
}
