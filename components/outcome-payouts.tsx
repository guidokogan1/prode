import type { MatchViewModel } from "@/lib/domain";
import { getOutcomeFlag } from "@/lib/match-ui";

export function OutcomePayouts({ match }: { match: MatchViewModel }) {
  const totalPool = Object.values(match.poolByCode).reduce<number>((sum, value) => sum + (value ?? 0), 0);

  return (
    <div style={{ display: "grid", paddingInline: 4 }}>
      {match.allocation.map((outcome, index) => {
        const pool = match.poolByCode[outcome.code] ?? 0;
        const odds = pool > 0 ? totalPool / pool : 0;
        return (
          <div
            key={outcome.code}
            className="split-row"
            style={{ gap: 16, padding: "16px 0", borderTop: index === 0 ? undefined : "1px solid rgba(255,255,255,0.08)" }}
          >
            <strong style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>
              {getOutcomeFlag(outcome.code, match)} {outcome.label}
            </strong>
            <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>
              {odds > 0 ? `paga x${odds.toFixed(2)}` : "sin apuestas"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
