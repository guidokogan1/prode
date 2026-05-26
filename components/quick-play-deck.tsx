"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchViewModel } from "@/lib/domain";
import { buildFocusedAllocation } from "@/lib/game";
import { saveStoredAllocation } from "@/lib/local-store";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
};

export function QuickPlayDeck({ matches }: QuickPlayDeckProps) {
  const router = useRouter();
  const playableMatches = useMemo(() => matches.filter((match) => match.isEditable), [matches]);
  const deck = playableMatches.length ? playableMatches : matches;
  const [index, setIndex] = useState(0);

  if (!deck.length) {
    return null;
  }

  const match = deck[index] ?? deck[0];
  const isLast = index === deck.length - 1;

  function handlePick(label: string) {
    const preset = buildFocusedAllocation(
      match.allocation.map((item) => item.label),
      label,
    ).map((item) => ({
      label: item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(match.id, preset);
    router.push(`/matches/${match.id}`);
  }

  function goNext() {
    setIndex((current) => (current + 1) % deck.length);
  }

  return (
    <section className="quick-play">
      <div className="quick-play-copy">
        <p className="eyebrow">Jugá ahora</p>
        <h2 className="quick-play-title">¿Qué sale?</h2>
        <p className="quick-play-subtitle">{match.kickoffLabel}</p>
      </div>

      <article className="card quick-play-card">
        <div className="quick-play-stage">
          <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="game-clock">{match.stage}</span>
        </div>

        <div className="quick-play-scoreboard">
          <div className="quick-play-team">
            <span className="flag">{match.home.flag}</span>
            <strong>{match.home.name}</strong>
          </div>
          <span className="quick-play-vs">vs</span>
          <div className="quick-play-team">
            <span className="flag">{match.away.flag}</span>
            <strong>{match.away.name}</strong>
          </div>
        </div>

        <div className="quick-pick-grid">
          {match.allocation.map((item) => (
            <button
              key={item.label}
              className="quick-pick-button"
              type="button"
              onClick={() => handlePick(item.label)}
            >
              <span className="quick-pick-label">{item.label}</span>
              <span className="quick-pick-helper">Ir con esta</span>
            </button>
          ))}
        </div>

        <div className="quick-play-footer">
          <span className="match-state-chip">{match.userStateLabel}</span>
          {deck.length > 1 ? (
            <button className="text-link-button" type="button" onClick={goNext}>
              {isLast ? "Volver al primero" : "Siguiente partido"}
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}
