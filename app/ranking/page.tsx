import { RankingList } from "@/components/ranking-list";
import { getRanking } from "@/lib/repositories/ranking";

export default async function RankingPage() {
  const ranking = await getRanking();
  const leader = ranking[0];

  return (
    <main className="stack page-narrow">
      <section className="section-title section-title-compact">
        <div>
          <p className="eyebrow">Tabla</p>
          <h1 className="page-title">Quién va arriba</h1>
        </div>
        <span className="subtle">{ranking.length} jugadores</span>
      </section>

      <section className="card compact-summary compact-summary-game">
        <strong>{leader?.name ?? "Sin datos"}</strong>
        <span className="subtle">viene picando con {leader?.netLabel ?? "0"}</span>
      </section>

      <RankingList items={ranking} />
    </main>
  );
}
