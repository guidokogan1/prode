import type { RankingEntry } from "@/lib/domain";
import { formatNetAmount } from "@/lib/format";

type RankingListProps = {
  items: RankingEntry[];
};

export function RankingList({ items }: RankingListProps) {
  return (
    <section style={{ display: "grid", gap: 10, fontFamily: "var(--font-body)" }}>
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
            background: item.isCurrentUser ? "rgba(212,166,75,0.08)" : "rgba(255,255,255,0.03)",
            borderColor: item.isCurrentUser ? "rgba(212,166,75,0.25)" : "rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              width: 24,
              flexShrink: 0,
              textAlign: "center",
              fontFamily: "var(--font-accent)",
              fontWeight: 800,
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
              background: item.isCurrentUser ? "rgba(212,166,75,0.18)" : "rgba(255,255,255,0.07)",
              color: item.isCurrentUser ? "#D8B56A" : "#EDE8D9",
              fontFamily: "var(--font-accent)",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {item.name.slice(0, 1)}
          </span>
          <div style={{ display: "grid", gap: 3, flex: 1, minWidth: 0 }}>
            <strong
              style={{
                color: item.isCurrentUser ? "#D8B56A" : "#EDE8D9",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontStyle: "normal",
                letterSpacing: "-0.02em",
              }}
            >
              {item.name}
            </strong>
            <span className="micro-copy" style={{ fontFamily: "var(--font-body)", fontStyle: "normal", lineHeight: 1.45 }}>
              {item.positiveTickets} positivas · mejor {formatNetAmount(item.bestHitAmount)}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 68 }}>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.18rem", color: item.netAmount >= 0 ? "#EDE8D9" : "#E8413A", whiteSpace: "nowrap", letterSpacing: "-0.04em" }}>{formatNetAmount(item.netAmount)}</strong>
            <div className="micro-copy" style={{ fontFamily: "var(--font-body)", fontStyle: "normal", letterSpacing: ".08em", textTransform: "uppercase" }}>
              {item.isCurrentUser ? "vos" : "neto"}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
