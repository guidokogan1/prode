import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { RankingList } from "@/components/ranking-list";
import { getRanking } from "@/lib/repositories/ranking";

export default async function RankingPage() {
  const ranking = await getRanking();

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 6, paddingTop: 8 }}>
        <p className="eyebrow">Tabla</p>
        <h1 className="display-title">Quién va arriba</h1>
        <p className="muted-copy">{ranking.length} jugadores peleando la punta del grupo.</p>
      </section>

      <LeaderboardPodium items={ranking} />

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 className="section-title">Leaderboard</h2>
          <span className="pill">general</span>
        </div>
        <RankingList items={ranking} />
      </section>
    </main>
  );
}
