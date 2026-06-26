import type { ReactNode } from "react";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";

type VoteFaceProps = {
  match: MatchViewModel;
  showDrawGesture: boolean;
  centerMode?: "vs" | "score";
  topRightLabel?: string;
  outcomeTargets?: {
    left: MatchOutcomeCode;
    right: MatchOutcomeCode;
    draw: MatchOutcomeCode | null;
  };
  onSelectOutcome?: (code: MatchOutcomeCode) => void;
  footerSlot?: ReactNode;
};

export function VoteFace({ match, showDrawGesture, centerMode = "vs", topRightLabel, outcomeTargets, onSelectOutcome, footerSlot }: VoteFaceProps) {
  const handlePressStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const leftControl = outcomeTargets && onSelectOutcome ? (
    <button
      type="button"
      className="button-ghost"
      style={{ minHeight: 0, padding: 0, color: "var(--gold)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em", justifyContent: "flex-start" }}
      onPointerDown={handlePressStart}
      onClick={() => onSelectOutcome(outcomeTargets.left)}
    >
      ← {match.home.name}
    </button>
  ) : (
    <span style={{ color: "var(--gold)", fontFamily: "var(--font-body)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em" }}>← {match.home.name}</span>
  );

  const drawControl =
    showDrawGesture && outcomeTargets?.draw && onSelectOutcome ? (
      <button
      type="button"
      className="button-ghost"
      style={{ minHeight: 0, padding: 0, color: "var(--outcome-draw)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em" }}
      onPointerDown={handlePressStart}
      onClick={() => onSelectOutcome(outcomeTargets.draw!)}
    >
      ↑ Empate
      </button>
    ) : showDrawGesture ? (
      <span style={{ color: "var(--outcome-draw)", fontFamily: "var(--font-body)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em" }}>↑ Empate</span>
    ) : (
      <span className="micro-copy">{match.marketTypeLabel}</span>
    );

  const rightControl = outcomeTargets && onSelectOutcome ? (
    <button
      type="button"
      className="button-ghost"
      style={{ minHeight: 0, padding: 0, color: "var(--live)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em", justifyContent: "flex-end" }}
      onPointerDown={handlePressStart}
      onClick={() => onSelectOutcome(outcomeTargets.right)}
    >
      {match.away.name} →
    </button>
  ) : (
    <span style={{ color: "var(--live)", fontFamily: "var(--font-body)", fontSize: ".78rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{match.away.name} →</span>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: "100%",
        minHeight: "100%",
        alignContent: "stretch",
        padding: 14,
        position: "relative",
        zIndex: 1,
        fontFamily: "var(--font-barlow), system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="eyebrow" style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif" }}>{match.stage}</span>
        {topRightLabel ? (
          <div className="status-pill status-pill-gold" style={{ minHeight: 24, paddingInline: 8 }}>
            <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif" }}>{topRightLabel}</span>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          alignSelf: "stretch",
          alignItems: "center",
          paddingBlock: 12,
        }}
      >
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 4, alignItems: "center" }}>
          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
            <span style={{ fontSize: "2.4rem", lineHeight: 1 }}>{match.home.flag}</span>
            <span className="team-display" style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontStyle: "normal", textAlign: "center" }}>{match.home.name}</span>
            <span className="micro-copy" style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontStyle: "normal", fontSize: ".62rem", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(151,173,153,0.74)" }}>Local</span>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <span style={{ fontFamily: centerMode === "score" ? "var(--font-accent)" : "var(--font-body)", fontSize: centerMode === "score" ? "1.65rem" : ".92rem", fontWeight: centerMode === "score" ? 800 : 700, color: centerMode === "score" ? "#EDE8D9" : "rgba(255,255,255,0.18)", letterSpacing: centerMode === "score" ? "-0.05em" : ".08em", textTransform: centerMode === "score" ? "none" : "uppercase" }}>
              {centerMode === "score" ? `${match.home.score} - ${match.away.score}` : "vs"}
            </span>
          </div>
          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
            <span style={{ fontSize: "2.4rem", lineHeight: 1 }}>{match.away.flag}</span>
            <span className="team-display" style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontStyle: "normal", textAlign: "center" }}>{match.away.name}</span>
            <span className="micro-copy" style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontStyle: "normal", fontSize: ".62rem", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(151,173,153,0.74)" }}>Visitante</span>
          </div>
        </div>
      </div>

      {footerSlot ? (
        <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>{footerSlot}</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 8,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6 }}>
            {leftControl}
          </div>
          {showDrawGesture ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {drawControl}
            </div>
          ) : drawControl}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            {rightControl}
          </div>
        </div>
      )}
    </div>
  );
}
