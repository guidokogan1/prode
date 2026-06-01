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
  const moneyLabel = getUserResultPill(match.userStateLabel);

  if (!resolvedOutcome || !winningOutcome) {
    return null;
  }

  const pickedWinner = leadingAllocation?.code === resolvedOutcome;
  const toneColor = resultTone === "negative" ? "#FF8B84" : resultTone === "positive" ? "#7EDC96" : "#D8B56A";
  const pickPill = !leadingAllocation ? "Sin jugar" : pickedWinner ? "Acertaste" : "No entró";
  const detail =
    !leadingAllocation
      ? `No jugaste este partido. Ganó ${winningOutcome.label}.`
      : pickedWinner
        ? `Fuiste con ${leadingAllocation.label}. Acertaste el lado, pero este partido cerró ${netLabel}.`
        : `Fuiste con ${leadingAllocation.label}, pero ganó ${winningOutcome.label}.`;

  return (
    <section
      className="surface-card-strong"
      style={{
        padding: 22,
        display: "grid",
        gap: 16,
        background: `linear-gradient(160deg, color-mix(in srgb, ${toneColor} 12%, #17301d) 0%, #091409 100%)`,
        borderColor: `${toneColor}26`,
      }}
    >
      <div className="split-row" style={{ alignItems: "start", flexWrap: "wrap" }}>
        <div className="title-stack">
          <p className="eyebrow">Liquidado</p>
          <h1 className="display-title">{netLabel}</h1>
          <p className="muted-copy">{detail}</p>
        </div>
        <span className="pill">{pickPill}</span>
      </div>

      <div className="surface-card-soft soft-panel" style={{ background: "rgba(255,255,255,0.05)", display: "grid", gap: 12 }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <span className="micro-copy">Tu resultado</span>
          <strong
            style={{
              fontFamily: "var(--font-accent)",
              fontSize: "1.55rem",
              letterSpacing: "-0.05em",
              color: toneColor,
            }}
          >
            {moneyLabel} {netLabel}
          </strong>
        </div>

        <div className="stats-grid">
          <div className="surface-card-soft soft-panel-md" style={{ display: "grid", gap: 4 }}>
            <span className="micro-copy">Ganó</span>
            <strong style={{ color: getOutcomeColor(resolvedOutcome) }}>
              {getOutcomeFlag(resolvedOutcome, match)} {winningOutcome.label}
            </strong>
          </div>
          <div className="surface-card-soft soft-panel-md" style={{ display: "grid", gap: 4 }}>
            <span className="micro-copy">Tu pick</span>
            <strong>{leadingAllocation?.label ?? "Sin jugar"}</strong>
            {leadingAllocation ? (
              <span className="micro-copy" style={{ color: getOutcomeColor(leadingAllocation.code) }}>
                {formatCredits(leadingAllocation.amount)}
              </span>
            ) : null}
          </div>
          <div className="surface-card-soft soft-panel-md text-right" style={{ display: "grid", gap: 4 }}>
            <span className="micro-copy">Marcador</span>
            <strong>{match.home.score} - {match.away.score}</strong>
            <span className="micro-copy">{match.home.flag} {match.home.name} vs {match.away.flag} {match.away.name}</span>
          </div>
        </div>
      </div>

    </section>
  );
}
