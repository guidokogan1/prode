"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { ALLOCATION_EVENT, getStoredAllocation } from "@/lib/local-store";
import { getOutcomeColor, getOutcomeHint, getPickStateLabel } from "@/lib/match-ui";
import { MatchSummaryCard } from "@/components/match-summary-card";

type MatchOverviewProps = {
  match: MatchViewModel;
};

export function MatchOverview({ match }: MatchOverviewProps) {
  const [effectiveMatch, setEffectiveMatch] = useState(match);

  useEffect(() => {
    const sync = () => {
      const storedDraft = getStoredAllocation(match.id);
      if (!storedDraft?.allocations?.length) {
        setEffectiveMatch(match);
        return;
      }

      const amountByLabel = new Map(storedDraft.allocations.map((item) => [item.label, item.amount]));
      setEffectiveMatch({
        ...match,
        draftState: storedDraft.status,
        allocation: match.allocation.map((item) => {
          const amount = amountByLabel.get(item.label) ?? item.amount;
          return {
            ...item,
            amount,
            percentage: Math.round((amount / 10000) * 100),
          };
        }),
      });
    };

    sync();
    window.addEventListener(ALLOCATION_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(ALLOCATION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [match]);

  const leadingConsensus = useMemo(
    () => [...effectiveMatch.consensus].sort((left, right) => right.percentage - left.percentage)[0] ?? null,
    [effectiveMatch.consensus],
  );
  const leadingAllocation = useMemo(
    () => [...effectiveMatch.allocation].sort((left, right) => right.amount - left.amount)[0] ?? null,
    [effectiveMatch.allocation],
  );
  const isReveal = effectiveMatch.revealedTickets.length > 0;

  return (
    <section className="section-stack">
      <MatchSummaryCard
        match={effectiveMatch}
        trailing={
          !isReveal && leadingConsensus ? (
            <span className="status-pill status-pill-gold">
              {leadingConsensus.label} {leadingConsensus.percentage}%
            </span>
          ) : (
            <span className="micro-copy">{effectiveMatch.venue}</span>
          )
        }
      />

      <div className="surface-card-soft soft-panel split-row" style={{ alignItems: "center" }}>
        <div style={{ display: "grid", gap: 3 }}>
          <span className="micro-copy">Tu jugada</span>
          <strong style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{leadingAllocation?.label ?? "Sin jugar"}</strong>
        </div>
        {leadingAllocation ? (
          <div className="text-right">
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.2rem", color: getOutcomeColor(leadingAllocation.code), letterSpacing: "-0.04em" }}>
              {formatCredits(leadingAllocation.amount)}
            </strong>
            <div className="micro-copy">{getOutcomeHint(leadingAllocation.code, effectiveMatch.marketType)}</div>
          </div>
        ) : null}
      </div>

      {!isReveal ? (
        <div className="surface-card-soft soft-panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {effectiveMatch.consensus.map((item) => (
              <div key={item.code} style={{ display: "grid", gap: 4, minWidth: 82 }}>
                <span className="micro-copy">{item.label}</span>
                <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-accent)", fontSize: "1.16rem", letterSpacing: "-0.04em" }}>
                  {item.percentage}%
                </strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
