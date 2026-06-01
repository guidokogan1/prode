import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits, formatNetAmount } from "@/lib/format";
import { deriveResolvedOutcome, formatCompactCredits, getOutcomeColor, getOutcomeFlag } from "@/lib/match-ui";

type LiveSocialBoardProps = {
  match: MatchViewModel;
};

export function LiveSocialBoard({ match }: LiveSocialBoardProps) {
  const resolvedOutcome = deriveResolvedOutcome(match);
  const grouped = new Map<
    MatchOutcomeCode,
    {
      outcome: MatchViewModel["allocation"][number];
      tickets: {
        userName: string;
        amount: number;
        amountLabel: string;
        netAmount?: number;
      }[];
    }
  >();

  for (const outcome of match.allocation) {
    grouped.set(outcome.code, { outcome, tickets: [] });
  }

  for (const ticket of match.revealedTickets) {
    const dominant = [...ticket.allocations].sort((left, right) => right.amount - left.amount)[0];

    if (!dominant) {
      continue;
    }

    const bucket = grouped.get(dominant.code);
    if (!bucket) {
      continue;
    }

    bucket.tickets.push({
      userName: ticket.userName,
      amount: dominant.amount,
      amountLabel: formatCredits(dominant.amount),
      netAmount: ticket.netAmount,
    });
  }

  const totalPot = match.revealedTickets.reduce(
    (sum, ticket) => sum + ticket.allocations.reduce((ticketTotal, item) => ticketTotal + item.amount, 0),
    0,
  );
  const groups = [...grouped.values()].sort((left, right) => {
    const leftWinning = resolvedOutcome === left.outcome.code ? 0 : 1;
    const rightWinning = resolvedOutcome === right.outcome.code ? 0 : 1;

    if (leftWinning !== rightWinning) {
      return leftWinning - rightWinning;
    }

    return right.tickets.length - left.tickets.length;
  });

  return (
    <section className="section-stack-lg">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <p className="eyebrow">Grupo</p>
          <h2 className="section-title">Cómo entró</h2>
        </div>
        <span className="pill">{match.revealedTickets.length} picks</span>
      </div>

      {groups.map((group) => {
        const isWinning = resolvedOutcome === group.outcome.code;

        return (
          <article
            key={group.outcome.code}
            className="surface-card-soft"
            style={{
              padding: 0,
              borderColor: isWinning ? `${getOutcomeColor(group.outcome.code)}30` : "rgba(255,255,255,0.06)",
              background: isWinning ? `${getOutcomeColor(group.outcome.code)}0A` : "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.35rem" }}>{getOutcomeFlag(group.outcome.code, match)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontFamily: "var(--font-body)", fontSize: "1rem", fontStyle: "normal", fontWeight: 700, color: isWinning ? getOutcomeColor(group.outcome.code) : "#EDE8D9" }}>
                    {group.outcome.label}
                  </strong>
                  {isWinning ? (
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontStyle: "normal",
                        fontSize: ".62rem",
                        fontWeight: 800,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        borderRadius: 999,
                        padding: "4px 8px",
                        background: `${getOutcomeColor(group.outcome.code)}20`,
                        color: getOutcomeColor(group.outcome.code),
                      }}
                    >
                      ganó
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="micro-copy">{group.tickets.length} picks</span>
            </div>

            <div style={{ display: "grid", gap: 10, padding: 14 }}>
              {group.tickets.length ? (
                group.tickets.map((ticket) => (
                  <div key={`${group.outcome.code}-${ticket.userName}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: isWinning ? `${getOutcomeColor(group.outcome.code)}20` : "rgba(255,255,255,0.08)",
                          color: isWinning ? getOutcomeColor(group.outcome.code) : "#EDE8D9",
                          fontFamily: "var(--font-accent)",
                          fontWeight: 800,
                        }}
                      >
                        {ticket.userName.slice(0, 1)}
                      </span>
                      <div style={{ display: "grid", gap: 2 }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: ".92rem", fontStyle: "normal", fontWeight: 700 }}>{ticket.userName}</span>
                        {ticket.netAmount != null ? <span className="micro-copy">{formatNetAmount(ticket.netAmount)}</span> : null}
                      </div>
                    </div>
                    <strong style={{ color: isWinning ? getOutcomeColor(group.outcome.code) : "#97AD99", fontFamily: "var(--font-accent)", fontSize: ".98rem", letterSpacing: "-0.04em" }}>
                      {ticket.amountLabel}
                    </strong>
                  </div>
                ))
              ) : (
                <span className="micro-copy">Sin jugadas</span>
              )}
            </div>
          </article>
        );
      })}

      <div className="surface-card-soft soft-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(212,166,75,0.07)", borderColor: "rgba(212,166,75,0.18)" }}>
        <span className="muted-copy">Pozo</span>
        <strong style={{ color: "#D8B56A", fontFamily: "var(--font-accent)", fontSize: "1.28rem", letterSpacing: "-0.05em" }}>{formatCompactCredits(totalPot)} cr</strong>
      </div>
    </section>
  );
}
