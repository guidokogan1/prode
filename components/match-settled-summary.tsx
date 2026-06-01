import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { deriveResolvedOutcome, getLeadingOutcome, getOutcomeColor, getOutcomeFlag } from "@/lib/match-ui";

type MatchSettledSummaryProps = {
  match: MatchViewModel;
};

export function MatchSettledSummary({ match }: MatchSettledSummaryProps) {
  const resolvedOutcome = deriveResolvedOutcome(match);
  const winningOutcome = resolvedOutcome ? match.consensus.find((item) => item.code === resolvedOutcome) ?? null : null;
  const leadingAllocation = getLeadingOutcome(match);
  const resultLabel = match.userStateLabel.startsWith("Resultado") ? match.userStateLabel.replace("Resultado ", "") : match.userStateLabel;

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
          <h1 className="display-title">{resultLabel}</h1>
        </div>
        <span className="pill">Final</span>
      </div>

      <div className="surface-card-soft soft-panel" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "2rem", lineHeight: 1 }}>{getOutcomeFlag(resolvedOutcome, match)}</span>
            <div className="title-stack">
              <span className="micro-copy">Ganó</span>
              <strong style={{ fontSize: "1.12rem", color: getOutcomeColor(resolvedOutcome) }}>{winningOutcome.label}</strong>
            </div>
          </div>
          <strong className="score-display" style={{ fontSize: "clamp(2.2rem, 10vw, 3.2rem)" }}>
            {match.home.score} - {match.away.score}
          </strong>
        </div>
      </div>

      <div className="two-col-grid">
        <div className="surface-card-soft soft-panel-md" style={{ display: "grid", gap: 4 }}>
          <span className="micro-copy">Tu lado</span>
          <strong>{leadingAllocation?.label ?? "Sin jugar"}</strong>
          {leadingAllocation ? (
            <span className="micro-copy" style={{ color: getOutcomeColor(leadingAllocation.code) }}>
              {formatCredits(leadingAllocation.amount)}
            </span>
          ) : null}
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
