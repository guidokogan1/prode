"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchViewModel } from "@/lib/domain";
import { getOutcomeColor } from "@/lib/match-ui";

type MatchCardProps = {
  match: MatchViewModel;
};

export function MatchCard({ match }: MatchCardProps) {
  const cardState = getMatchCardState(match, "compact");
  const statusTone =
    cardState.mode === "live"
      ? "rgba(255,85,71,0.05)"
      : cardState.mode === "settled"
        ? "rgba(216,255,86,0.04)"
        : "rgba(255,255,255,0.02)";
  const statusBorder =
    cardState.mode === "live"
      ? "rgba(255,85,71,0.28)"
      : cardState.mode === "settled"
        ? "rgba(216,255,86,0.2)"
        : "rgba(255,255,255,0.1)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
    >
      <Link
        href={`/matches/${match.id}`}
        className="surface-card-soft"
        style={{
          padding: "16px 16px 14px",
          borderRadius: 18,
          display: "grid",
          gap: 13,
          background: `color-mix(in srgb, rgba(10,14,20,0.98) 92%, ${statusTone} 8%)`,
          borderColor: statusBorder,
        }}
      >
        <div className="split-row" style={{ alignItems: "center", flexWrap: "wrap", minHeight: 32 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="pill">{cardState.secondaryStatusLabel ?? cardState.primaryStatusLabel}</span>
            {match.groupLabel ? (
              <span
                className="micro-copy"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: "var(--text-tertiary)",
                  fontWeight: 600,
                }}
              >
                {match.groupLabel}
              </span>
            ) : null}
          </div>
          <span className="micro-copy">{cardState.scoreOrKickoffLabel}</span>
        </div>

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0, width: 28, textAlign: "center" }}>{match.home.flag}</span>
              <strong
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: ".98rem",
                  fontStyle: "normal",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {match.home.name}
              </strong>
            </div>

            {cardState.mode === "live" || cardState.mode === "settled" ? (
              <strong
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "1.3rem",
                  color: cardState.mode === "live" ? "var(--live)" : "var(--text-primary)",
                  letterSpacing: "-0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {match.home.score} - {match.away.score}
              </strong>
            ) : (
              <span style={{ color: "var(--text-tertiary)", textAlign: "center", fontFamily: "var(--font-display)", fontSize: ".95rem", letterSpacing: ".08em" }}>VS</span>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>
              <strong
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: ".98rem",
                  fontStyle: "normal",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "right",
                }}
              >
                {match.away.name}
              </strong>
              <span style={{ fontSize: "1.25rem", flexShrink: 0, width: 28, textAlign: "center" }}>{match.away.flag}</span>
            </div>
          </div>

          <div className="split-row" style={{ alignItems: "end", gap: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 11 }}>
            <div style={{ display: "grid", gap: 3 }}>
              <span className="micro-copy">Tu jugada</span>
              <strong
                style={{
                  fontSize: "1rem",
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  color:
                    cardState.heroTone === "positive"
                      ? "var(--gold)"
                      : cardState.heroTone === "negative"
                        ? "var(--live)"
                        : undefined,
                }}
              >
                {cardState.heroValue}
              </strong>
            </div>
            {cardState.mode !== "editable-empty" ? (
              <span
                className="micro-copy"
                style={{
                  color:
                    cardState.mode === "settled"
                      ? cardState.heroTone === "positive"
                        ? "var(--gold)"
                        : cardState.heroTone === "negative"
                          ? "var(--live)"
                          : undefined
                      : cardState.leadingUserOutcome
                        ? getOutcomeColor(cardState.leadingUserOutcome.code)
                        : undefined,
                }}
              >
                {cardState.heroDescription}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
