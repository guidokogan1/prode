import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { deriveResolvedOutcome, getLeadingOutcome, getOutcomeColor, getOutcomeFlag, getUserNetLabel, getUserResultPill, getUserResultTone } from "@/lib/match-ui";

type MatchSettledSummaryProps = {
  match: MatchViewModel;
};

export function MatchSettledSummary({ match }: MatchSettledSummaryProps) {
  const resolvedOutcome = deriveResolvedOutcome(match);
  const winningOutcome = resolvedOutcome ? match.consensus.find((item) => item.code === resolvedOutcome) ?? null : null;
  const leadingAllocation = getLeadingOutcome(match);
  const resultTone = getUserResultTone(match.userStateLabel);
  const netLabel = getUserNetLabel(match.userStateLabel);
  const pillLabel = getUserResultPill(match.userStateLabel);

  if (!resolvedOutcome || !winningOutcome) {
    return null;
  }

  return (
    <section
      className="surface-card-strong"
      style={{
        padding: 22,
        display: "grid",
        gap: 18,
        background: `linear-gradient(160deg, color-mix(in srgb, ${getOutcomeColor(resolvedOutcome)} 18%, #1C3522) 0%, #091409 100%)`,
        borderColor: `${getOutcomeColor(resolvedOutcome)}30`,
      }}
    >
      <div className="split-row" style={{ alignItems: "start", flexWrap: "wrap" }}>
        <div className="title-stack">
          <p className="eyebrow">Liquidado</p>
          <h1 className="display-title">Ganó {winningOutcome.label}</h1>
          <p className="muted-copy">Tu neto {netLabel}</p>
        </div>
        <span className="pill">{pillLabel}</span>
      </div>

      <div className="surface-card-soft soft-panel" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "2rem", lineHeight: 1 }}>{getOutcomeFlag(resolvedOutcome, match)}</span>
            <div className="title-stack">
              <span className="micro-copy">Resultado</span>
              <strong style={{ fontSize: "1.12rem", color: getOutcomeColor(resolvedOutcome) }}>{match.home.score} - {match.away.score}</strong>
            </div>
          </div>
          <strong
            style={{
              fontFamily: "var(--font-accent)",
              fontSize: "clamp(1.8rem, 8vw, 2.6rem)",
              letterSpacing: "-0.05em",
              color: resultTone === "negative" ? "#FF8B84" : resultTone === "positive" ? "#7EDC96" : "#EDE8D9",
            }}
          >
            {netLabel}
          </strong>
        </div>
      </div>

      <div className="stats-grid">
        <div className="surface-card-soft soft-panel-md" style={{ display: "grid", gap: 4 }}>
          <span className="micro-copy">Tu lado</span>
          <strong>{leadingAllocation?.label ?? "Sin jugar"}</strong>
          {leadingAllocation ? (
            <span className="micro-copy" style={{ color: getOutcomeColor(leadingAllocation.code) }}>
              {formatCredits(leadingAllocation.amount)}
            </span>
          ) : null}
        </div>
        <div className="surface-card-soft soft-panel-md" style={{ display: "grid", gap: 4 }}>
          <span className="micro-copy">Cómo te fue</span>
          <strong style={{ color: resultTone === "negative" ? "#FF8B84" : resultTone === "positive" ? "#7EDC96" : "#EDE8D9" }}>{pillLabel}</strong>
          <span className="micro-copy">{netLabel}</span>
        </div>
        <div className="surface-card-soft soft-panel-md text-right" style={{ display: "grid", gap: 4 }}>
          <span className="micro-copy">Partido</span>
          <strong>{match.home.flag} {match.home.name}</strong>
          <span className="micro-copy">{match.away.flag} {match.away.name}</span>
        </div>
      </div>
    </section>
  );
}
