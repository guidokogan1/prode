import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { RankingList } from "@/components/ranking-list";
import { ShareByIdButton } from "@/components/share-by-id-button";
import { formatGross } from "@/lib/format";
import { getRanking } from "@/lib/repositories/ranking";
import { getRankingTimeline } from "@/lib/repositories/timeline";
import { getTournamentFinalState } from "@/lib/repositories/tournament";
import { computeRankMovement } from "@/lib/rank-movement";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const [ranking, tournament, timeline] = await Promise.all([getRanking(), getTournamentFinalState(), getRankingTimeline()]);
  const movements = computeRankMovement(ranking, timeline);
  const currentUser = ranking.find((item) => item.isCurrentUser) ?? null;
  const leader = ranking[0] ?? null;
  const finished = tournament.finished;

  if (!ranking.length) {
    return (
      <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }}>
        <section className="title-stack" style={{ paddingTop: 8, gap: 6 }}>
          <h1 className="display-title">Tabla actual</h1>
        </section>
        <section className="surface-card-soft soft-panel section-stack" style={{ textAlign: "center", padding: 32 }}>
          <p className="muted-copy">Todavía no hay resultados. La tabla se arma cuando empiecen a liquidarse los partidos.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }} id="ranking-share-target">
      <section className="title-stack" style={{ paddingTop: 8, gap: 6 }}>
        <div className="split-row" style={{ alignItems: "start", gap: 12 }}>
          <div className="title-stack" style={{ gap: 6 }}>
            {finished ? <p className="eyebrow" style={{ color: "var(--gold)" }}>Mundial terminado</p> : null}
            <h1 className="display-title">{finished ? "Tabla final" : "Tabla actual"}</h1>
            {finished && tournament.winnerTeam ? (
              <p className="muted-copy">
                Campeón {tournament.winnerTeam.flag} {tournament.winnerTeam.name}
              </p>
            ) : null}
          </div>
          <ShareByIdButton
            targetId="ranking-share-target"
            fileName="prode-tabla.jpg"
            shareText={finished ? "Cómo terminó la tabla del prode" : "Así va la tabla del prode"}
            label="Compartir"
          />
        </div>
      </section>

      <section className="two-col-grid">
        {currentUser ? (
          <section className="surface-card-soft soft-panel section-stack" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="micro-copy">Tu puesto</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>#{currentUser.position} {currentUser.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.05em", color: currentUser.grossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>{formatGross(currentUser.grossAmount)}</strong>
            </div>
          </section>
        ) : null}
        {leader ? (
          <section className="surface-card-soft soft-panel section-stack" style={{ background: "rgba(216,255,86,0.06)", borderColor: "rgba(216,255,86,0.18)" }}>
            <span className="micro-copy">Líder</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>#{leader.position} {leader.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.05em", color: leader.grossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>{formatGross(leader.grossAmount)}</strong>
            </div>
          </section>
        ) : null}
      </section>

      <LeaderboardPodium items={ranking} />

      <section className="section-stack" style={{ gap: 12 }}>
        <div className="split-row">
          <h2 className="section-title">General</h2>
          <span className="pill">{ranking.length}</span>
        </div>
        <RankingList items={ranking} timeline={timeline} movements={movements} />
      </section>
    </main>
  );
}
