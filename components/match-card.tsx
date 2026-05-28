"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { getLeadingOutcome, getOutcomeColor } from "@/lib/match-ui";

type MatchCardProps = {
  match: MatchViewModel;
};

function getOutcomeChipLabel(code: MatchOutcomeCode, match: MatchViewModel) {
  if (code === "draw") {
    return "EMP";
  }

  if (code === "home" || code === "home_qualifies") {
    return match.home.name.slice(0, 3).toUpperCase();
  }

  return match.away.name.slice(0, 3).toUpperCase();
}

export function MatchCard({ match }: MatchCardProps) {
  const leading = getLeadingOutcome(match);
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
          ) : leading ? (
            <span className="micro-copy" style={{ color: getOutcomeColor(leading.code) }}>✓</span>
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
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {match.home.name.slice(0, 3).toUpperCase()}
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
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {match.away.name.slice(0, 3).toUpperCase()}
              </strong>
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{match.away.flag}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>{match.stage}</span>
            <span style={{ color: "#7A9A81", fontFamily: "var(--font-body)", fontSize: ".78rem", fontStyle: "normal", fontWeight: 700, whiteSpace: "nowrap" }}>{match.kickoffLabel}</span>
          </div>
        </div>

        {leading ? (
          <div
            style={{
              flexShrink: 0,
              borderRadius: 999,
              padding: "6px 10px",
              background: `${getOutcomeColor(leading.code)}18`,
              border: `1px solid ${getOutcomeColor(leading.code)}30`,
              color: getOutcomeColor(leading.code),
              fontFamily: "var(--font-body)",
              fontSize: ".68rem",
              fontStyle: "normal",
              fontWeight: 800,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              minWidth: 56,
              textAlign: "center",
            }}
          >
            {getOutcomeChipLabel(leading.code, match)}
          </div>
        ) : null}
      </Link>
    </motion.div>
  );
}
