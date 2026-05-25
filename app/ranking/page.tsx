import { RankingList } from "@/components/ranking-list";
import { getRanking } from "@/lib/repositories/ranking";

export default async function RankingPage() {
  const ranking = await getRanking();
  const leader = ranking[0];
  const chasePack = ranking.filter((entry) => entry.net >= 0).length;

  return (
    <main className="stack page-mid">
      <section className="section-title">
        <div>
          <p className="eyebrow">Tabla general</p>
          <h1 className="page-title">Ganancia acumulada</h1>
        </div>
        <span className="pill">104 partidos</span>
      </section>

      <section className="card card-grid">
        <p className="body-copy">
          La tabla suma solo el resultado neto de cada jugada. No hay billetera ni saldo
          persistente: cada partido arranca con 10.000 creditos nuevos.
        </p>
        <div className="stat-grid ranking-summary">
          <div className="stat-cell">
            <strong>{leader?.name ?? "Sin datos"}</strong>
            <span>Puntero actual</span>
          </div>
          <div className="stat-cell">
            <strong>{leader?.netLabel ?? "0"}</strong>
            <span>Mejor rendimiento</span>
          </div>
          <div className="stat-cell">
            <strong>{chasePack}</strong>
            <span>Arriba de la base</span>
          </div>
          <div className="stat-cell">
            <strong>{ranking.length}</strong>
            <span>Jugadores activos</span>
          </div>
        </div>
      </section>

      <RankingList items={ranking} />
    </main>
  );
}
