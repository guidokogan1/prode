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
            padding: "15px 16px",
            borderRadius: 16,
            display: "grid",
            gridTemplateColumns: "24px 38px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 12,
            background: item.isCurrentUser ? "rgba(216,255,86,0.08)" : "rgba(255,255,255,0.045)",
            borderColor: item.isCurrentUser ? "rgba(216,255,86,0.24)" : "rgba(255,255,255,0.1)",
          }}
        >
          <span
            style={{
              width: 24,
              flexShrink: 0,
              textAlign: "center",
              fontFamily: "var(--font-accent)",
              fontWeight: 800,
              color: item.position <= 3 ? ["var(--gold)", "#d6d8dd", "#ff8f57"][item.position - 1] : "var(--text-secondary)",
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
              background: item.isCurrentUser ? "rgba(216,255,86,0.14)" : "rgba(255,255,255,0.07)",
              color: item.isCurrentUser ? "var(--gold)" : "#EDE8D9",
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
                color: item.isCurrentUser ? "var(--gold)" : "#EDE8D9",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontStyle: "normal",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
              }}
            >
              {item.name}
            </strong>
            <span className="micro-copy" style={{ fontFamily: "var(--font-body)", fontStyle: "normal", lineHeight: 1.45 }}>
              {item.positiveTickets} positivas · mejor {formatNetAmount(item.bestHitAmount)}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 68 }}>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.34rem", color: item.netAmount >= 0 ? "#EDE8D9" : "var(--live)", whiteSpace: "nowrap", letterSpacing: "-0.05em" }}>{formatNetAmount(item.netAmount)}</strong>
            <div className="micro-copy" style={{ fontFamily: "var(--font-body)", fontStyle: "normal", letterSpacing: ".08em", textTransform: "uppercase" }}>
              {item.isCurrentUser ? "vos" : "neto"}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
