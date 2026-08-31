"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { motion } from "motion/react";
import { SessionContext } from "@/components/session-provider";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildSinglePickAllocation, creditForMarketType } from "@/lib/game";
import { buildAllocationScope } from "@/lib/local-store";
import { getOutcomeColor } from "@/lib/match-ui";
import { savePick } from "@/lib/pick-save";
import { TeamCrest } from "@/components/team-crest";

type MatchCardProps = {
  match: MatchViewModel;
};

function withLocalPick(match: MatchViewModel, code: MatchOutcomeCode, credit: number): MatchViewModel {
  return {
    ...match,
    draftState: "saved_remote",
    allocation: match.allocation.map((item) => ({
      ...item,
      amount: item.code === code ? credit : 0,
      percentage: item.code === code ? 100 : 0,
    })),
  };
}

export function MatchCard({ match }: MatchCardProps) {
  const [localPickCode, setLocalPickCode] = useState<MatchOutcomeCode | null>(null);
  const session = useContext(SessionContext);
  const allocationScope = buildAllocationScope(session);

  const credit = creditForMarketType(match.marketType);
  const displayMatch = localPickCode ? withLocalPick(match, localPickCode, credit) : match;
  const cardState = getMatchCardState(displayMatch, "compact");
  const showAlarm = cardState.mode === "editable-empty";

  function handleInlinePick(code: MatchOutcomeCode) {
    if (localPickCode === code) {
      return;
    }

    // Optimistic: flip the card to "saved" instantly, save in the background.
    // A failed save falls back to the app's existing unconfirmed-picks banner + retry.
    setLocalPickCode(code);

    const payload = buildSinglePickAllocation(
      match.allocation.map((item) => item.code),
      code,
      credit,
    ).map((item) => ({
      code: item.outcomeCode as MatchOutcomeCode,
      label: match.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    void savePick(allocationScope, match.id, payload);
  }

  const statusTone =
    cardState.mode === "live"
      ? "rgba(244,166,60,0.05)"
      : cardState.mode === "settled"
        ? "rgba(63,227,242,0.04)"
        : "rgba(255,255,255,0.02)";
  const statusBorder = showAlarm
    ? "rgba(244,166,60,0.45)"
    : cardState.mode === "live"
      ? "rgba(244,166,60,0.28)"
      : cardState.mode === "settled"
        ? "rgba(63,227,242,0.2)"
        : "rgba(255,255,255,0.1)";
  const cardBackground = showAlarm
    ? "linear-gradient(155deg, color-mix(in srgb, rgba(10,14,20,0.98) 94%, rgba(244,166,60,0.55) 6%) 0%, color-mix(in srgb, rgba(10,14,20,0.98) 84%, rgba(244,166,60,0.55) 16%) 100%)"
    : `color-mix(in srgb, rgba(10,14,20,0.98) 92%, ${statusTone} 8%)`;

  const cardStyle = {
    padding: "16px 16px 14px",
    borderRadius: 18,
    display: "grid" as const,
    gap: 13,
    background: cardBackground,
    borderColor: statusBorder,
    borderWidth: showAlarm ? 1.5 : undefined,
  };

  const header = (
    <div className="split-row" style={{ alignItems: "center", flexWrap: "wrap", minHeight: 32 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="pill">{cardState.secondaryStatusLabel ?? cardState.primaryStatusLabel}</span>
        {match.groupLabel ? (
          <span
            className="micro-copy"
            style={{ textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-tertiary)", fontWeight: 600 }}
          >
            {match.groupLabel}
          </span>
        ) : null}
      </div>
      <span className="micro-copy">{cardState.scoreOrKickoffLabel}</span>
    </div>
  );

  const teamsRow = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ flexShrink: 0, width: 28, display: "flex", justifyContent: "center" }}>
          <TeamCrest url={match.home.logo} alt={match.home.name} size={26} />
        </span>
        <strong
          style={{ fontFamily: "var(--font-body)", fontSize: ".98rem", fontStyle: "normal", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}
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
        <span style={{ flexShrink: 0, width: 28, display: "flex", justifyContent: "center" }}>
          <TeamCrest url={match.away.logo} alt={match.away.name} size={26} />
        </span>
      </div>
    </div>
  );

  if (showAlarm) {
    return (
      <div className="surface-card-soft" style={cardStyle}>
        {header}

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {teamsRow}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 11,
            }}
          >
            {match.allocation.map((outcome) => {
              const outcomeColor = getOutcomeColor(outcome.code);
              const label = outcome.code === "draw" ? "Empate" : outcome.code === "home" ? match.home.name : match.away.name;
              const crestMatch = outcome.code === "home" ? match.home : outcome.code === "away" ? match.away : null;
              return (
                <motion.button
                  key={outcome.code}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handleInlinePick(outcome.code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 6px",
                    minHeight: 40,
                    borderRadius: 12,
                    border: `1px solid color-mix(in srgb, ${outcomeColor} 50%, transparent)`,
                    background: `color-mix(in srgb, ${outcomeColor} 8%, transparent)`,
                    color: outcomeColor,
                    fontFamily: "var(--font-body)",
                    fontSize: ".78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {crestMatch ? <TeamCrest url={crestMatch.logo} alt={crestMatch.name} size={16} /> : null}
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.985 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
      <Link href={`/matches/${match.id}`} className="surface-card-soft" style={cardStyle}>
        {header}

        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {teamsRow}

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
                        ? "var(--negative)"
                        : undefined,
                }}
              >
                {cardState.heroValue}
              </strong>
            </div>
            <span
              className="micro-copy"
              style={{
                color:
                  cardState.mode === "settled"
                    ? cardState.heroTone === "positive"
                      ? "var(--gold)"
                      : cardState.heroTone === "negative"
                        ? "var(--negative)"
                        : undefined
                    : cardState.leadingUserOutcome
                      ? getOutcomeColor(cardState.leadingUserOutcome.code)
                      : undefined,
              }}
            >
              {cardState.heroDescription}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
