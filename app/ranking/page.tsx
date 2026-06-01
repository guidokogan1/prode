import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { RankingList } from "@/components/ranking-list";
import { formatNetAmount } from "@/lib/format";
import { getRanking } from "@/lib/repositories/ranking";

export default async function RankingPage() {
  const ranking = await getRanking();
  const currentUser = ranking.find((item) => item.isCurrentUser) ?? null;

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }}>
      <section className="title-stack" style={{ paddingTop: 8 }}>
        <p className="eyebrow">Tabla</p>
        <h1 className="display-title">Ranking</h1>
        <p className="muted-copy" style={{ fontFamily: "var(--font-body)" }}>Ordenado por ganancia</p>
      </section>

      {currentUser ? (
        <section className="surface-card-soft soft-panel section-stack">
          <span className="micro-copy">Tu puesto</span>
          <div className="split-row">
            <strong style={{ fontSize: "1.05rem" }}>#{currentUser.position} {currentUser.name}</strong>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", letterSpacing: "-0.04em" }}>{formatNetAmount(currentUser.netAmount)}</strong>
          </div>
        </section>
      ) : null}

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
