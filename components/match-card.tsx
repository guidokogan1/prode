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
      ? "rgba(255,59,48,0.07)"
      : cardState.mode === "settled"
        ? "rgba(61,155,95,0.06)"
        : "rgba(255,255,255,0.03)";
  const statusBorder =
    cardState.mode === "live"
      ? "rgba(255,59,48,0.2)"
      : cardState.mode === "settled"
        ? "rgba(61,155,95,0.15)"
        : "rgba(255,255,255,0.06)";

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
          borderRadius: 20,
          display: "grid",
          gap: 12,
          background: statusTone,
          borderColor: statusBorder,
        }}
      >
        <div className="split-row" style={{ alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">{cardState.primaryStatusLabel}</span>
            {cardState.secondaryStatusLabel ? <span className="pill">{cardState.secondaryStatusLabel}</span> : null}
          </div>
          <span className="micro-copy">{cardState.scoreOrKickoffLabel}</span>
        </div>

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{match.home.flag}</span>
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
                  fontSize: "1.05rem",
                  color: cardState.mode === "live" ? "#FF3B30" : "#EDE8D9",
                  letterSpacing: "-0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {match.home.score} - {match.away.score}
              </strong>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.16)", textAlign: "center" }}>VS</span>
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
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{match.away.flag}</span>
            </div>
          </div>

          <div className="split-row" style={{ alignItems: "end", gap: 12, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
            <div style={{ display: "grid", gap: 3 }}>
              <span className="micro-copy">Tu jugada</span>
              <strong style={{ fontSize: ".96rem", letterSpacing: "-0.02em" }}>{cardState.heroValue}</strong>
            </div>
            <span className="micro-copy" style={{ color: cardState.leadingUserOutcome ? getOutcomeColor(cardState.leadingUserOutcome.code) : undefined }}>
              {cardState.heroDescription}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
