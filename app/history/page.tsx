import { getHistory } from "@/lib/repositories/history";

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 6, paddingTop: 8 }}>
        <p className="eyebrow">Rachas</p>
        <h1 className="display-title">Tus últimas rondas</h1>
        <p className="muted-copy">{history.length} partidos para leer rápido cómo venís entrando.</p>
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        {history.map((item) => (
          <article
            key={item.id}
            className="surface-card-soft"
            style={{
              padding: 18,
              borderRadius: 20,
              background: item.net >= 0 ? "rgba(61,155,95,0.08)" : "rgba(232,65,58,0.07)",
              borderColor: item.net >= 0 ? "rgba(61,155,95,0.18)" : "rgba(232,65,58,0.15)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 3 }}>
                <strong>{item.title}</strong>
                <span className="micro-copy">{item.stage}</span>
              </div>
              <span className={item.net >= 0 ? "money-positive" : "money-negative"} style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
                {item.netLabel}
              </span>
            </div>

            <p className="muted-copy">{item.description}</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.allocations.map((allocation) => (
                <span key={`${item.id}-${allocation.label}`} className="pill">
                  {allocation.label}: {allocation.amount}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
