import { getHistory } from "@/lib/repositories/history";

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <main className="stack page-mid">
      <section className="section-title">
        <div>
          <p className="eyebrow">Historial</p>
          <h1 className="page-title">Tus ultimas jugadas</h1>
        </div>
        <p className="subtle">Resumen claro, partido por partido</p>
      </section>

      <div className="list">
        {history.map((item) => (
          <section
            className={`card history-row ${item.net >= 0 ? "history-positive" : "history-negative"}`}
            key={item.id}
          >
            <div className="section-title history-topline">
              <div>
                <strong>{item.title}</strong>
                <p className="subtle history-stage">{item.stage}</p>
              </div>
              <span className={`pill history-net ${item.net >= 0 ? "positive-pill" : "negative-pill"}`}>
                {item.netLabel}
              </span>
            </div>
            <p className="body-copy">{item.description}</p>
            <div className="pill-row allocation-pills">
              {item.allocations.map((allocation) => (
                <span className="pill" key={allocation.label}>
                  {allocation.label}: {allocation.amount}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
