"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildSinglePickAllocation, creditForMarketType } from "@/lib/game";
import { buildAllocationScope } from "@/lib/local-store";
import { getOutcomeColor, getQuickPlayOutcomeTargets } from "@/lib/match-ui";
import { savePick } from "@/lib/pick-save";
import { TeamCrest } from "@/components/team-crest";

type MatchCardProps = {
  match: MatchViewModel;
};

type InlinePickState = "idle" | "saving" | "saved" | "error";

export function MatchCard({ match }: MatchCardProps) {
  const cardState = getMatchCardState(match, "compact");
  const isPending = cardState.mode === "editable-empty";
  const [pickState, setPickState] = useState<InlinePickState>("idle");
  const showAlarm = isPending && pickState !== "saved";
  const session = useContext(SessionContext);
  const allocationScope = buildAllocationScope(session);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);

  async function handleInlinePick(code: MatchOutcomeCode) {
    if (pickState === "saving" || pickState === "saved") {
      return;
    }

    const label = match.allocation.find((item) => item.code === code)?.label ?? code;
    setPickState("saving");
    setPickedLabel(label);

    const credit = creditForMarketType(match.marketType);
    const payload = buildSinglePickAllocation(
      match.allocation.map((item) => item.code),
      code,
      credit,
    ).map((item) => ({
      code: item.outcomeCode as MatchOutcomeCode,
      label: match.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    const result = await savePick(allocationScope, match.id, payload);
    setPickState(result.confirmed ? "saved" : "error");
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

  if (showAlarm) {
    const outcomeTargets = getQuickPlayOutcomeTargets(match);
    const topRightLabel = match.groupLabel ? `${match.groupLabel} · ${cardState.scoreOrKickoffLabel}` : cardState.scoreOrKickoffLabel;

    return (
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
      >
        <div className="surface-card-soft" style={cardStyle}>
          <div style={{ opacity: pickState === "saving" ? 0.55 : 1, pointerEvents: pickState === "saving" ? "none" : "auto" }}>
            <VoteFace
              match={match}
              showDrawGesture={match.marketType === "1x2"}
              topRightLabel={topRightLabel}
              outcomeTargets={outcomeTargets}
              onSelectOutcome={(code) => {
                void handleInlinePick(code);
              }}
            />
          </div>
          {pickState === "error" ? (
            <span className="micro-copy" style={{ color: "var(--negative)", textAlign: "center" }}>
              No se pudo guardar, probá de nuevo.
            </span>
          ) : null}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
    >
      <Link href={`/matches/${match.id}`} className="surface-card-soft" style={cardStyle}>
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
              <span style={{ flexShrink: 0, width: 28, display: "flex", justifyContent: "center" }}>
                <TeamCrest url={match.home.logo} alt={match.home.name} size={26} />
              </span>
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
              <span style={{ flexShrink: 0, width: 28, display: "flex", justifyContent: "center" }}>
                <TeamCrest url={match.away.logo} alt={match.away.name} size={26} />
              </span>
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
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color:
                    pickState === "saved"
                      ? "var(--gold)"
                      : cardState.heroTone === "positive"
                        ? "var(--gold)"
                        : cardState.heroTone === "negative"
                          ? "var(--negative)"
                          : undefined,
                }}
              >
                {pickState === "saved" ? (
                  <>
                    <Check size={15} strokeWidth={2.5} />
                    {pickedLabel}
                  </>
                ) : (
                  cardState.heroValue
                )}
              </strong>
            </div>
            {pickState === "saved" ? (
              <span className="micro-copy" style={{ color: "var(--gold)" }}>Guardado</span>
            ) : cardState.mode !== "editable-empty" ? (
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
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
