import { getHistory } from "@/lib/repositories/history";
import { formatCredits, formatGross } from "@/lib/format";

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="surface-card" style={{ display: "grid", gap: 10, padding: 14 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Ledger</p>
            <h1 className="display-title">Historial</h1>
          </div>
          <span className="pill">{history.length}</span>
        </div>
        <p className="muted-copy">Tus jugadas cerradas, ordenadas por resultado.</p>
      </section>

      {!history.length ? (
        <section className="surface-card-soft soft-panel section-stack" style={{ textAlign: "center", padding: 32 }}>
          <p className="muted-copy">Todavía no tenés jugadas liquidadas. Acá van a aparecer cuando se cierren los partidos que jugaste.</p>
        </section>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {history.map((item) => (
          <article
            key={item.id}
            className="surface-card-soft"
            style={{
              padding: 14,
              borderRadius: 14,
              background: item.grossAmount > 0 ? "rgba(216,255,86,0.05)" : "rgba(255,255,255,0.03)",
              borderColor: item.grossAmount > 0 ? "rgba(216,255,86,0.16)" : "rgba(255,255,255,0.08)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 3 }}>
                <strong>{item.title}</strong>
                <span className="micro-copy">{item.stage}</span>
              </div>
              <span className={item.grossAmount > 0 ? "money-positive" : "money-negative"} style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.02em" }}>
                {formatGross(item.grossAmount)}
              </span>
            </div>

            {item.allocations[0] ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span className="pill">{getTopAllocationLabel(item)}</span>
                <span className="micro-copy">{item.description}</span>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              {item.allocations.map((allocation) => (
                <div
                  key={`${item.id}-${allocation.label}`}
                  className="surface-card-soft"
                  style={{ padding: "9px 10px", borderRadius: 10, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="micro-copy">{allocation.label}</span>
                  <strong>{formatCredits(allocation.amount)}</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function getTopAllocationLabel(item: (Awaited<ReturnType<typeof getHistory>>)[number]) {
  const leading = [...item.allocations].sort((left, right) => right.amount - left.amount)[0];
  return leading ? `Más a ${leading.label}` : "Sin jugada";
}
