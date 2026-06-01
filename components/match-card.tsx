"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { MatchViewModel } from "@/lib/domain";
import { getMatchActionLabel, getMatchStateLabel, getPickStateLabel } from "@/lib/match-ui";

type MatchCardProps = {
  match: MatchViewModel;
};

export function MatchCard({ match }: MatchCardProps) {
  const actionLabel = getMatchActionLabel(match);
  const matchState = getMatchStateLabel(match);
  const pickState = getPickStateLabel(match);
  const statusTone =
    match.statusVariant === "live"
      ? "rgba(255,59,48,0.07)"
      : match.statusVariant === "settled"
        ? "rgba(61,155,95,0.06)"
        : "rgba(255,255,255,0.03)";
  const statusBorder =
    match.statusVariant === "live"
      ? "rgba(255,59,48,0.2)"
      : match.statusVariant === "settled"
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
          padding: "14px 16px",
          borderRadius: 18,
          display: "grid",
          gridTemplateColumns: "18px minmax(0, 1fr) auto",
          gap: 12,
          alignItems: "center",
          background: statusTone,
          borderColor: statusBorder,
        }}
      >
        <div style={{ width: 18, display: "grid", placeItems: "center", flexShrink: 0 }}>
          {match.statusVariant === "live" ? (
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#FF3B30", boxShadow: "0 0 12px rgba(255,59,48,.6)" }} />
          ) : match.statusVariant === "locked" ? (
            <span className="micro-copy">🔒</span>
          ) : match.isEditable && pickState === "Sin jugar" ? (
            <span className="micro-copy" style={{ color: "#D4A64B" }}>●</span>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
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

            {match.statusVariant === "live" || match.statusVariant === "settled" ? (
              <strong
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "1.05rem",
                  color: match.statusVariant === "live" ? "#FF3B30" : "#EDE8D9",
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>{match.kickoffLabel}</span>
            <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>{match.stage}</span>
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderRadius: 999,
            padding: "6px 10px",
            background:
              matchState === "En vivo"
                ? "rgba(255,59,48,0.12)"
                : pickState === "Sin jugar"
                  ? "rgba(212,166,75,0.12)"
                  : "rgba(255,255,255,0.04)",
            border:
              matchState === "En vivo"
                ? "1px solid rgba(255,59,48,0.24)"
                : pickState === "Sin jugar"
                  ? "1px solid rgba(212,166,75,0.24)"
                  : "1px solid rgba(255,255,255,0.08)",
            color:
              actionLabel === "En vivo"
                ? "#FF8B84"
                : actionLabel === "Jugar"
                  ? "#D4A64B"
                  : "#EDE8D9",
            fontFamily: "var(--font-body)",
            fontSize: ".68rem",
            fontStyle: "normal",
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            minWidth: 72,
            textAlign: "center",
          }}
        >
          {actionLabel}
        </div>
      </Link>
    </motion.div>
  );
}
