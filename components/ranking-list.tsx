"use client";

import { useState } from "react";
import type { RankingEntry, RankingTimeline } from "@/lib/domain";
import { formatGross } from "@/lib/format";
import { RankingTimelineDrawer } from "@/components/ranking-timeline-drawer";
import { RankMovementIndicator } from "@/components/rank-movement-indicator";

type RankingListProps = {
  items: RankingEntry[];
  timeline?: RankingTimeline | null;
};

export function RankingList({ items, timeline }: RankingListProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section style={{ display: "grid", gap: 10, fontFamily: "var(--font-body)" }}>
      {items.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() => timeline ? setSelected(item.name) : undefined}
          className="surface-card-soft"
          style={{
            padding: "15px 16px",
            borderRadius: 16,
            display: "grid",
            gridTemplateColumns: "40px 38px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 9,
            background: item.isCurrentUser ? "rgba(63,227,242,0.08)" : "rgba(255,255,255,0.045)",
            borderColor: item.isCurrentUser ? "rgba(63,227,242,0.24)" : "rgba(255,255,255,0.1)",
            textAlign: "left",
            cursor: timeline ? "pointer" : "default",
            font: "inherit",
            color: "inherit",
          }}
        >
          <span
            style={{
              width: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ width: 17, display: "flex", justifyContent: "flex-end" }}>
              <RankMovementIndicator movement={item.movement ?? null} />
            </span>
            <span
              style={{
                fontFamily: "var(--font-accent)",
                fontWeight: 800,
                color: item.position <= 3 ? ["var(--gold)", "#d6d8dd", "#ff8f57"][item.position - 1] : "var(--text-secondary)",
              }}
            >
              {item.position}
            </span>
          </span>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: item.isCurrentUser ? "rgba(63,227,242,0.14)" : "rgba(255,255,255,0.07)",
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
              {item.positiveTickets} {item.positiveTickets === 1 ? "acierto" : "aciertos"} · mejor {formatGross(item.bestHitGrossAmount)}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 68 }}>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.34rem", color: item.grossAmount > 0 ? "#EDE8D9" : "var(--text-secondary)", whiteSpace: "nowrap", letterSpacing: "-0.05em" }}>{formatGross(item.grossAmount)}</strong>
            <div className="micro-copy" style={{ fontFamily: "var(--font-body)", fontStyle: "normal", lineHeight: 1.45 }}>
              {item.isCurrentUser ? "vos" : "total"}
            </div>
          </div>
        </button>
      ))}

      {timeline ? (
        <RankingTimelineDrawer
          timeline={timeline}
          selectedUserName={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
