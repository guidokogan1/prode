import { getHistory } from "@/lib/repositories/history";
import { formatCredits, formatNetAmount } from "@/lib/format";

export default async function HistoryPage() {
  const history = await getHistory();

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 6, paddingTop: 8 }}>
        <p className="eyebrow">Historial</p>
        <h1 className="display-title">Últimas jugadas</h1>
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        {history.map((item) => (
          <article
            key={item.id}
            className="surface-card-soft"
            style={{
              padding: 18,
              borderRadius: 20,
              background: item.netAmount >= 0 ? "rgba(61,155,95,0.08)" : "rgba(232,65,58,0.07)",
              borderColor: item.netAmount >= 0 ? "rgba(61,155,95,0.18)" : "rgba(232,65,58,0.15)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 3 }}>
                <strong>{item.title}</strong>
                <span className="micro-copy">{item.stage}</span>
              </div>
              <span className={item.netAmount >= 0 ? "money-positive" : "money-negative"} style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
                {formatNetAmount(item.netAmount)}
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
                  style={{ padding: "10px 12px", borderRadius: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
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
