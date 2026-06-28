import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits, formatGross } from "@/lib/format";
import { deriveResolvedOutcome, formatCompactCredits, getOutcomeFlag } from "@/lib/match-ui";

function buildGroupBuckets(match: MatchViewModel) {
  const grouped = new Map<
    MatchOutcomeCode,
    {
      outcome: MatchViewModel["allocation"][number];
      tickets: { userName: string; amount: number; netAmount?: number }[];
    }
  >();

  for (const outcome of match.allocation) {
    grouped.set(outcome.code, { outcome, tickets: [] });
  }

  for (const ticket of match.revealedTickets) {
    for (const allocation of ticket.allocations) {
      if (allocation.amount <= 0) continue;
      const bucket = grouped.get(allocation.code);
      if (!bucket) continue;
      bucket.tickets.push({ userName: ticket.userName, amount: allocation.amount, netAmount: ticket.netAmount });
    }
  }

  for (const bucket of grouped.values()) {
    bucket.tickets.sort((left, right) => right.amount - left.amount);
  }

  const winningOutcome = deriveResolvedOutcome(match);

  return [...grouped.values()].sort((left, right) => {
    const leftRank = winningOutcome === left.outcome.code ? 0 : 1;
    const rightRank = winningOutcome === right.outcome.code ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return right.tickets.length - left.tickets.length;
  });
}

export function MatchRevealPanel({ match }: { match: MatchViewModel }) {
  const resolvedOutcome = deriveResolvedOutcome(match);
  const isRevealed = match.marketStatus === "revealed" || match.marketStatus === "settled";
  const isSettled = match.marketStatus === "settled" || match.statusVariant === "settled";
  const groupBuckets = buildGroupBuckets(match);

  const totalPot = match.revealedTickets.reduce(
    (sum, ticket) => sum + ticket.allocations.reduce((ticketTotal, item) => ticketTotal + item.amount, 0),
    0,
  );

  const liquidationRows = isSettled
    ? match.revealedTickets
        .filter((ticket): ticket is typeof ticket & { netAmount: number } => typeof ticket.netAmount === "number")
        .map((ticket) => ({
          userName: ticket.userName,
          netAmount: ticket.netAmount,
          grossAmount: ticket.grossAmount ?? ticket.netAmount + 10000,
        }))
        .sort((left, right) => right.grossAmount - left.grossAmount)
    : [];

  const settlementBreakdown = (() => {
    if (!isSettled || !resolvedOutcome || totalPot <= 0) return null;

    const userAllocations = match.allocation.filter((item) => item.amount > 0);
    const winningBucket = groupBuckets.find((bucket) => bucket.outcome.code === resolvedOutcome);
    const winningLabel = winningBucket?.outcome.label ?? "el ganador";
    const winningPool = winningBucket?.tickets.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const userStakeOnWinner = userAllocations.find((item) => item.code === resolvedOutcome)?.amount ?? 0;
    const userDominant = [...userAllocations].sort((a, b) => b.amount - a.amount)[0];

    return {
      hasPlayed: userAllocations.length > 0,
      winningLabel,
      winningPool,
      userStakeOnWinner,
      userDominantLabel: userDominant?.label ?? null,
      dominantHit: userDominant?.code === resolvedOutcome,
      userGross: winningPool > 0 ? totalPot * (userStakeOnWinner / winningPool) : 0,
      userSharePct: winningPool > 0 ? (userStakeOnWinner / winningPool) * 100 : 0,
      totalPot,
    };
  })();

  return (
    <div style={{ display: "grid", gap: 18, paddingInline: 4 }}>
      {groupBuckets.map((bucket) => {
        const isWinning = resolvedOutcome === bucket.outcome.code;
        const totalOnOutcome = bucket.tickets.reduce((sum, ticket) => sum + ticket.amount, 0);
        const poolForOutcome = match.poolByCode[bucket.outcome.code] ?? 0;
        const totalPoolPreLock = Object.values(match.poolByCode).reduce<number>((sum, value) => sum + (value ?? 0), 0);
        const oddsMultiplier = poolForOutcome > 0 ? totalPoolPreLock / poolForOutcome : 0;
        const summaryLabel = isRevealed
          ? totalOnOutcome > 0
            ? formatCredits(totalOnOutcome)
            : "sin apuestas"
          : oddsMultiplier > 0
            ? `paga x${oddsMultiplier.toFixed(2)}`
            : "sin apuestas";
        const headerColor = !resolvedOutcome ? "#EDE8D9" : isWinning ? "var(--gold)" : "var(--text-tertiary)";

        return (
          <article key={bucket.outcome.code} style={{ display: "grid", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="split-row" style={{ gap: 16 }}>
              <strong style={{ color: headerColor, fontSize: "1rem", textTransform: "uppercase" }}>
                {getOutcomeFlag(bucket.outcome.code, match)} {bucket.outcome.label}
              </strong>
              <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>
                {summaryLabel}
              </span>
            </div>
            {isRevealed && bucket.tickets.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {bucket.tickets.map((ticket, index) => (
                  <div key={`${bucket.outcome.code}-${ticket.userName}-${index}`} className="split-row">
                    <strong style={{ fontSize: ".92rem" }}>{ticket.userName}</strong>
                    <strong style={{ color: isWinning ? "var(--gold)" : "var(--text-tertiary)", fontFamily: "var(--font-accent)", letterSpacing: "-0.04em" }}>
                      {formatCredits(ticket.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}

      {liquidationRows.length ? (
        <section style={{ display: "grid", gap: 12, paddingTop: 12 }}>
          <div className="split-row" style={{ gap: 16 }}>
            <strong style={{ fontSize: "1rem", textTransform: "uppercase", color: "#EDE8D9" }}>Liquidación</strong>
            <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>Cobrado por jugador</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {liquidationRows.map((row) => (
              <div key={`liquidation-${row.userName}`} className="split-row">
                <strong style={{ fontSize: ".92rem" }}>{row.userName}</strong>
                <strong style={{ color: row.grossAmount > 0 ? "var(--gold)" : "var(--text-tertiary)", fontFamily: "var(--font-accent)", letterSpacing: "-0.04em" }}>
                  {formatGross(row.grossAmount)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {settlementBreakdown ? (
        <section className="surface-card-soft" style={{ marginTop: 4, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", display: "grid", gap: 8 }}>
          <strong style={{ fontSize: ".95rem", textTransform: "uppercase" }}>Cómo se calcula tu cobro</strong>
          {!settlementBreakdown.hasPlayed ? (
            <p className="muted-copy" style={{ margin: 0 }}>
              No jugaste este partido. Por eso cobraste {formatGross(0)}.
            </p>
          ) : settlementBreakdown.userStakeOnWinner === 0 ? (
            <p className="muted-copy" style={{ margin: 0, lineHeight: 1.55 }}>
              Fuiste con <strong>{settlementBreakdown.userDominantLabel}</strong>. Ganó <strong>{settlementBreakdown.winningLabel}</strong>. No pusiste nada al ganador, por eso cobraste {formatGross(0)}.
            </p>
          ) : (
            <p className="muted-copy" style={{ margin: 0, lineHeight: 1.55 }}>
              {settlementBreakdown.dominantHit ? (
                <>
                  Pusiste <strong>{formatGross(settlementBreakdown.userStakeOnWinner)}</strong> a <strong>{settlementBreakdown.winningLabel}</strong>.
                </>
              ) : (
                <>
                  Tu pick principal era <strong>{settlementBreakdown.userDominantLabel}</strong>, pero pusiste <strong>{formatGross(settlementBreakdown.userStakeOnWinner)}</strong> a <strong>{settlementBreakdown.winningLabel}</strong>, que ganó.
                </>
              )}
              {" "}El pozo de {settlementBreakdown.winningLabel} fue <strong>{formatGross(settlementBreakdown.winningPool)}</strong>, así que tu parte es <strong>{Math.round(settlementBreakdown.userSharePct)}%</strong>. El pozo total fue <strong>{formatGross(settlementBreakdown.totalPot)}</strong>, por eso cobraste <strong style={{ color: "var(--gold)" }}>{formatGross(settlementBreakdown.userGross)}</strong>.
            </p>
          )}
        </section>
      ) : null}

      {totalPot > 0 ? (
        <div className="split-row" style={{ paddingTop: 14, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="muted-copy">Pozo</span>
          <strong style={{ color: "var(--gold)", fontFamily: "var(--font-accent)", fontSize: "1.18rem", letterSpacing: "-0.05em" }}>
            {formatCompactCredits(totalPot)}
          </strong>
        </div>
      ) : null}
    </div>
  );
}
