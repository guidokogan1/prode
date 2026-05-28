import type { RankingEntry } from "@/lib/domain";

type RankingListProps = {
  items: RankingEntry[];
};

export function RankingList({ items }: RankingListProps) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <article
          key={item.name}
          className="surface-card-soft"
          style={{
            padding: "14px 16px",
            borderRadius: 18,
            display: "grid",
            gridTemplateColumns: "24px 38px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 12,
            background: item.name === "Vos" ? "rgba(212,166,75,0.08)" : "rgba(255,255,255,0.03)",
            borderColor: item.name === "Vos" ? "rgba(212,166,75,0.25)" : "rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              width: 24,
              flexShrink: 0,
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              color: item.position <= 3 ? ["#D4A64B", "#A0A0A0", "#CD7F32"][item.position - 1] : "#4A6A4D",
            }}
          >
            {item.position}
          </span>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: item.name === "Vos" ? "rgba(212,166,75,0.18)" : "rgba(255,255,255,0.07)",
              color: item.name === "Vos" ? "#D4A64B" : "#EDE8D9",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {item.name.slice(0, 1)}
          </span>
          <div style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
            <strong style={{ color: item.name === "Vos" ? "#D4A64B" : "#EDE8D9" }}>{item.name === "Vos" ? "Vos" : item.name}</strong>
            <span className="micro-copy" style={{ lineHeight: 1.45 }}>{item.positiveTickets} positivas · mejor {item.bestHit}</span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 68 }}>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: item.net >= 0 ? "#EDE8D9" : "#E8413A", whiteSpace: "nowrap" }}>{item.netLabel}</strong>
            <div className="micro-copy">ganancia</div>
          </div>
        </article>
      ))}
    </section>
  );
}
