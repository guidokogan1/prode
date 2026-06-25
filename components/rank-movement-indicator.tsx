type RankMovementIndicatorProps = {
  movement: number | null;
};

export function RankMovementIndicator({ movement }: RankMovementIndicatorProps) {
  if (movement == null) {
    return null;
  }

  if (movement === 0) {
    return (
      <span
        aria-label="se mantuvo"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.7rem",
          lineHeight: 1,
          color: "var(--text-tertiary)",
        }}
      >
        —
      </span>
    );
  }

  const isUp = movement > 0;
  const steps = Math.abs(movement);
  const color = isUp ? "var(--gold)" : "#ff5547";

  return (
    <span
      aria-label={isUp ? `subió ${steps}` : `bajó ${steps}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        color,
        fontFamily: "var(--font-accent)",
        fontWeight: 800,
        fontSize: "0.68rem",
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}
    >
      <span style={{ fontSize: "0.62rem" }}>{isUp ? "▲" : "▼"}</span>
      {steps > 1 ? <span>{steps}</span> : null}
    </span>
  );
}
