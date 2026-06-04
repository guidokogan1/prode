import type { RankingEntry } from "@/lib/domain";
import { formatCompactCredits } from "@/lib/match-ui";

type LeaderboardPodiumProps = {
  items: RankingEntry[];
};

const PODIUM_COLORS = ["#d8ff56", "#d8dde5", "#ff8f57"];
const PODIUM_EMOJIS = ["🥇", "🥈", "🥉"];

export function LeaderboardPodium({ items }: LeaderboardPodiumProps) {
  if (items.length < 3) {
    return null;
  }

  const podiumOrder = [items[1], items[0], items[2]].filter(Boolean);
  const heights = [80, 104, 64];
  const actualRanks = [1, 0, 2];

  return (
    <section className="surface-card-strong" style={{ padding: 18, fontFamily: "var(--font-body)" }}>
      <div style={{ display: "grid", gap: 4, marginBottom: 14 }}>
        <span className="micro-copy">Top 3</span>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Podio actual</strong>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "end" }}>
        {podiumOrder.map((item, index) => {
          const actualRank = actualRanks[index] ?? index;
          const color = PODIUM_COLORS[actualRank] ?? "#D4A64B";

          return (
            <div key={item.name} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.35rem" }}>{PODIUM_EMOJIS[actualRank]}</span>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: item.isCurrentUser ? "rgba(216,255,86,0.16)" : "rgba(255,255,255,0.07)",
                  color: item.isCurrentUser ? "var(--gold)" : "#EDE8D9",
                  border: item.isCurrentUser ? "2px solid rgba(216,255,86,0.34)" : "0",
                  fontFamily: "var(--font-accent)",
                  fontWeight: 800,
                }}
              >
                {item.name.slice(0, 1)}
              </span>
              <div
                style={{
                  width: "100%",
                  height: heights[index],
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "end center",
                  paddingBottom: 10,
                  background: actualRank === 0 ? color : `color-mix(in srgb, ${color} 72%, #111821 28%)`,
                  border: `1px solid ${color}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-accent)",
                    fontWeight: 800,
                    fontStyle: "normal",
                    letterSpacing: "-0.04em",
                    color: actualRank === 0 ? "#09110b" : "#f8fbff",
                  }}
                >
                  {formatCompactCredits(Math.abs(item.netAmount))}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: ".8rem", fontWeight: 700, fontStyle: "normal", letterSpacing: "-0.01em", textAlign: "center", textTransform: "uppercase" }}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
