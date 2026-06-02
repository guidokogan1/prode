import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { RankingList } from "@/components/ranking-list";
import { formatNetAmount } from "@/lib/format";
import { getRanking } from "@/lib/repositories/ranking";

export default async function RankingPage() {
  const ranking = await getRanking();
  const currentUser = ranking.find((item) => item.isCurrentUser) ?? null;
  const leader = ranking[0] ?? null;

  if (!ranking.length) {
    return (
      <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }}>
        <section className="title-stack" style={{ paddingTop: 8 }}>
          <p className="eyebrow">Tabla</p>
          <h1 className="display-title">Ranking</h1>
        </section>
        <section className="surface-card-soft soft-panel section-stack" style={{ textAlign: "center", padding: 32 }}>
          <p className="muted-copy">Todavía no hay resultados. La tabla se arma cuando empiecen a liquidarse los partidos.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }}>
      <section className="title-stack" style={{ paddingTop: 8 }}>
        <p className="eyebrow">Tabla</p>
        <h1 className="display-title">Ranking</h1>
        <p className="muted-copy" style={{ fontFamily: "var(--font-body)" }}>Ordenado por ganancia acumulada</p>
      </section>

      <section className="two-col-grid">
        {currentUser ? (
          <section className="surface-card-soft soft-panel section-stack">
            <span className="micro-copy">Tu puesto</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem" }}>#{currentUser.position} {currentUser.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", letterSpacing: "-0.04em" }}>{formatNetAmount(currentUser.netAmount)}</strong>
            </div>
          </section>
        ) : null}
        {leader ? (
          <section className="surface-card-soft soft-panel section-stack">
            <span className="micro-copy">Líder</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem" }}>#{leader.position} {leader.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", letterSpacing: "-0.04em", color: "#D8B56A" }}>{formatNetAmount(leader.netAmount)}</strong>
            </div>
          </section>
        ) : null}
      </section>

      <LeaderboardPodium items={ranking} />

      <section className="section-stack" style={{ gap: 12 }}>
        <div className="split-row">
          <h2 className="section-title" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>General</h2>
          <span className="pill">{ranking.length}</span>
        </div>
        <RankingList items={ranking} />
      </section>
    </main>
  );
}
