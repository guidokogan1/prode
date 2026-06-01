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
        footer={
          <div className="split-row" style={{ alignItems: "start", gap: 14 }}>
            <div style={{ display: "grid", gap: 3 }}>
              <span className="micro-copy">Tu jugada</span>
              <strong style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{leadingAllocation?.label ?? "Sin jugar"}</strong>
              {leadingAllocation ? (
                <span className="micro-copy" style={{ color: getOutcomeColor(leadingAllocation.code) }}>
                  {formatCredits(leadingAllocation.amount)} · {getOutcomeHint(leadingAllocation.code, effectiveMatch.marketType)}
                </span>
              ) : null}
            </div>
            {!isReveal && leadingConsensus ? (
              <div className="text-right" style={{ display: "grid", gap: 3 }}>
                <span className="micro-copy">Grupo</span>
                <strong>{leadingConsensus.label}</strong>
                <span className="micro-copy" style={{ color: getOutcomeColor(leadingConsensus.code) }}>
                  {leadingConsensus.percentage}%
                </span>
              </div>
            ) : null}
          </div>
        }
      />
    </section>
  );
}
