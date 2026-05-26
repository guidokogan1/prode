"use client";

import { useContext } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";

type RevealBoardProps = {
  tickets: MatchViewModel["revealedTickets"];
};

export function RevealBoard({ tickets }: RevealBoardProps) {
  const session = useContext(SessionContext);
  const sessionName = session?.displayName ?? null;

  const orderedTickets = [...tickets].sort((a, b) => {
    if (sessionName && a.userName === sessionName) {
      return -1;
    }

    if (sessionName && b.userName === sessionName) {
      return 1;
    }

    return 0;
  });

  return (
    <div className="reveal-board">
      {orderedTickets.map((ticket) => {
        const isMe = sessionName ? ticket.userName === sessionName : false;

        return (
          <article className={`reveal-card${isMe ? " reveal-card-me" : ""}`} key={ticket.userName}>
            <div className="reveal-card-top">
              <div className="reveal-identity">
                <span className="reveal-avatar" aria-hidden="true">
                  {ticket.userName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{isMe ? "Vos" : ticket.userName}</strong>
                  <p className="subtle">
                    {isMe ? "Tu jugada ya quedó cerrada" : "Jugada revelada"}
                  </p>
                </div>
              </div>
              {ticket.netLabel ? (
                <strong className={ticket.netLabel.startsWith("-") ? "money-negative" : "money-positive"}>
                  {ticket.netLabel}
                </strong>
              ) : (
                <span className="pill">En juego</span>
              )}
            </div>

            <div className="reveal-picks">
              {ticket.allocations.map((allocation) => (
                <div className="reveal-pick" key={`${ticket.userName}-${allocation.label}`}>
                  <span>{allocation.label}</span>
                  <strong>{allocation.amount}</strong>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
