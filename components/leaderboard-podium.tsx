import type { RankingEntry } from "@/lib/domain";
import { formatCompactCredits } from "@/lib/match-ui";

type LeaderboardPodiumProps = {
  items: RankingEntry[];
};

const PODIUM_COLORS = ["#D4A64B", "#A0A0A0", "#CD7F32"];
const PODIUM_EMOJIS = ["🥇", "🥈", "🥉"];

export function LeaderboardPodium({ items }: LeaderboardPodiumProps) {
  if (items.length < 3) {
    return null;
  }

  const podiumOrder = [items[1], items[0], items[2]].filter(Boolean);
  const heights = [80, 104, 64];
  const actualRanks = [1, 0, 2];

  return (
    <section className="surface-card-strong" style={{ padding: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "end" }}>
        {podiumOrder.map((item, index) => {
          const actualRank = actualRanks[index] ?? index;
          const color = PODIUM_COLORS[actualRank] ?? "#D4A64B";

          return (
            <div key={item.name} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.35rem" }}>{PODIUM_EMOJIS[index]}</span>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: item.name === "Vos" ? "rgba(212,166,75,0.2)" : "rgba(255,255,255,0.07)",
                  color: item.name === "Vos" ? "#D4A64B" : "#EDE8D9",
                  border: item.name === "Vos" ? "2px solid rgba(212,166,75,0.4)" : "0",
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
                  borderRadius: 16,
                  display: "grid",
                  placeItems: "end center",
                  paddingBottom: 10,
                  background: `${color}15`,
                  border: `1px solid ${color}25`,
                }}
              >
                <span style={{ fontFamily: "var(--font-accent)", fontWeight: 800, letterSpacing: "-0.04em", color }}>
                  {formatCompactCredits(Math.abs(item.net))}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: ".8rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
