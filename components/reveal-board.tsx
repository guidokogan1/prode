"use client";

import { useContext, useMemo } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";
import { formatCredits, formatGross } from "@/lib/format";

type RevealBoardProps = {
  tickets: MatchViewModel["revealedTickets"];
};

type OutcomeGroup = {
  label: string;
  totalAmount: number;
  tickets: MatchViewModel["revealedTickets"];
};

export function RevealBoard({ tickets }: RevealBoardProps) {
  const session = useContext(SessionContext);
  const sessionName = session?.displayName ?? null;

  const groupedOutcomes = useMemo(() => {
    const groups = new Map<string, OutcomeGroup>();

    for (const ticket of tickets) {
      const sortedAllocations = [...ticket.allocations].sort((left, right) => right.amount - left.amount);
      const dominant = sortedAllocations[0];
      if (!dominant) {
        continue;
      }

      const totalAmount = ticket.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);

      const existing = groups.get(dominant.label);
      if (existing) {
        existing.totalAmount += totalAmount;
        existing.tickets.push(ticket);
      } else {
        groups.set(dominant.label, {
          label: dominant.label,
          totalAmount,
          tickets: [ticket],
        });
      }
    }

    return [...groups.values()]
      .sort((left, right) => right.totalAmount - left.totalAmount)
      .map((group) => ({
        ...group,
        tickets: [...group.tickets].sort((a, b) => {
          if (sessionName && a.userName === sessionName) {
            return -1;
          }

          if (sessionName && b.userName === sessionName) {
            return 1;
          }

          const leftTop = Math.max(...a.allocations.map((allocation) => allocation.amount));
          const rightTop = Math.max(...b.allocations.map((allocation) => allocation.amount));
          return rightTop - leftTop;
        }),
      }));
  }, [sessionName, tickets]);

  const totalPot = useMemo(
    () =>
      tickets.reduce(
        (sum, ticket) =>
          sum +
          ticket.allocations.reduce((ticketTotal, allocation) => ticketTotal + allocation.amount, 0),
        0,
      ),
    [tickets],
  );

  return (
    <div className="reveal-board reveal-board-groups">
      <div className="reveal-pot-card">
        <span className="eyebrow">Pozo de esta ronda</span>
        <strong>{formatCredits(totalPot)}</strong>
        <span className="subtle">Así está cayendo el grupo ahora mismo.</span>
      </div>

      {groupedOutcomes.map((group) => (
        <section className="reveal-group-card" key={group.label}>
          <div className="reveal-group-head">
            <div>
              <p className="eyebrow">Pick dominante</p>
              <h3>{group.label}</h3>
            </div>
            <div className="reveal-group-meta">
              <strong>{group.tickets.length}</strong>
              <span>{group.tickets.length === 1 ? "jugada" : "jugadas"}</span>
            </div>
          </div>

          <div className="reveal-board">
            {group.tickets.map((ticket) => {
              const isMe = sessionName ? ticket.userName === sessionName : false;
              const mainPick = [...ticket.allocations].sort((left, right) => right.amount - left.amount)[0];

              return (
                <article className={`reveal-card${isMe ? " reveal-card-me" : ""}`} key={`${group.label}-${ticket.userName}`}>
                  <div className="reveal-card-top">
                    <div className="reveal-identity">
                      <span className="reveal-avatar" aria-hidden="true">
                        {ticket.userName.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{isMe ? "Vos" : ticket.userName}</strong>
                        <p className="subtle">
                          {mainPick ? `${mainPick.label} al frente` : "Jugada revelada"}
                        </p>
                      </div>
                    </div>
                    {ticket.netAmount != null ? (
                      <strong className={(ticket.grossAmount ?? ticket.netAmount + 10000) > 0 ? "money-positive" : "money-negative"}>
                        {formatGross(ticket.grossAmount ?? ticket.netAmount + 10000)}
                      </strong>
                    ) : (
                      <span className="pill">En juego</span>
                    )}
                  </div>

                  <div className="reveal-picks">
                    {ticket.allocations
                      .filter((allocation) => allocation.amount > 0)
                      .map((allocation) => (
                        <div
                          className={`reveal-pick${allocation.label === mainPick?.label ? " reveal-pick-main" : ""}`}
                          key={`${ticket.userName}-${allocation.label}`}
                        >
                          <span>{allocation.label}</span>
                          <strong>{formatCredits(allocation.amount)}</strong>
                        </div>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
