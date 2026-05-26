"use client";

import { useMemo, useState } from "react";
import type { MatchViewModel } from "@/lib/domain";
import { buildWeightedAllocation } from "@/lib/game";
import { saveStoredAllocation } from "@/lib/local-store";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
};

type PlayStep = "pick" | "intensity";

const INTENSITY_OPTIONS = [
  { label: "Fuerte", hint: "7.000 al que elegiste", amount: 7000 },
  { label: "Media", hint: "5.500 al que elegiste", amount: 5500 },
  { label: "Suave", hint: "4.000 al que elegiste", amount: 4000 },
];

export function QuickPlayDeck({ matches }: QuickPlayDeckProps) {
  const playableMatches = useMemo(() => matches.filter((match) => match.isEditable), [matches]);
  const deck = playableMatches.length ? playableMatches : matches;
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<PlayStep>("pick");
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  if (!deck.length) {
    return null;
  }

  const match = deck[index] ?? deck[0];
  const isLast = index === deck.length - 1;
  const nextMatch = isLast ? null : deck[index + 1];
  const progress = `${index + 1} / ${deck.length}`;
  const canDraw = match.allocation.length === 3;
  const leadingOutcome = match.allocation[0]?.label ?? "";
  const drawOutcome = canDraw ? match.allocation[1]?.label ?? "" : null;
  const trailingOutcome = match.allocation[match.allocation.length - 1]?.label ?? "";

  function resetInteraction() {
    setStep("pick");
    setSelectedOutcome(null);
    setDrag({ x: 0, y: 0, active: false });
    setDragStart(null);
  }

  function advanceDeck() {
    setIndex((current) => (current + 1) % deck.length);
    resetInteraction();
  }

  function chooseOutcome(label: string) {
    setSelectedOutcome(label);
    setStep("intensity");
    setDrag({ x: 0, y: 0, active: false });
    setDragStart(null);
  }

  function savePlay(focusedAmount: number) {
    if (!selectedOutcome) {
      return;
    }

    const preset = buildWeightedAllocation(
      match.allocation.map((item) => item.label),
      selectedOutcome,
      focusedAmount,
    ).map((item) => ({
      label: item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(match.id, preset);
    advanceDeck();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (step !== "pick") {
      return;
    }

    setDragStart({ x: event.clientX, y: event.clientY });
    setDrag({ x: 0, y: 0, active: true });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart || step !== "pick") {
      return;
    }

    setDrag({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
      active: true,
    });
  }

  function handlePointerUp() {
    if (!dragStart || step !== "pick") {
      return;
    }

    const absX = Math.abs(drag.x);
    const absY = Math.abs(drag.y);

    if (drag.x > 110) {
      chooseOutcome(leadingOutcome);
      return;
    }

    if (drag.x < -110) {
      chooseOutcome(trailingOutcome);
      return;
    }

    if (canDraw && drag.y < -110) {
      chooseOutcome(drawOutcome ?? "");
      return;
    }

    if (absX < 110 && absY < 110) {
      setDrag({ x: 0, y: 0, active: false });
      setDragStart(null);
      return;
    }

    setDrag({ x: 0, y: 0, active: false });
    setDragStart(null);
  }

  const dragLabel =
    step === "pick"
      ? drag.y < -80 && canDraw
        ? drawOutcome
        : drag.x > 80
          ? leadingOutcome
          : drag.x < -80
            ? trailingOutcome
            : null
      : null;
  const dragDirection =
    step === "pick"
      ? drag.y < -80 && canDraw
        ? "draw"
        : drag.x > 80
          ? "home"
          : drag.x < -80
            ? "away"
            : null
      : null;

  return (
    <section className="quick-play">
      <div className="quick-play-stage-shell">
        <div className="quick-play-deck-shadow" aria-hidden="true" />
        <div className="quick-play-deck-shadow quick-play-deck-shadow-back" aria-hidden="true" />
        <article
          className={`card quick-play-card quick-play-card-${step}${dragDirection ? ` drag-${dragDirection}` : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={
            step === "pick"
              ? {
                  transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 22}deg)`,
                }
              : undefined
          }
        >
          <div className="quick-play-topbar">
            <button className="quick-top-icon" type="button" onClick={step === "pick" ? advanceDeck : resetInteraction}>
              {step === "pick" ? "⟳" : "←"}
            </button>
            <div className="quick-play-dots" aria-hidden="true">
              {deck.map((_, dotIndex) => (
                <span
                  key={`dot-${dotIndex}`}
                  className={`quick-play-dot${dotIndex === index ? " active" : ""}`}
                />
              ))}
            </div>
            <span className="quick-play-progress">{progress}</span>
          </div>

          {step === "pick" ? (
            <div className="quick-swipe-overlay" aria-hidden="true">
              <span className={`quick-swipe-lane quick-swipe-lane-home${dragDirection === "home" ? " active" : ""}`}>
                → {leadingOutcome}
              </span>
              {drawOutcome ? (
                <span className={`quick-swipe-lane quick-swipe-lane-draw${dragDirection === "draw" ? " active" : ""}`}>
                  ↑ {drawOutcome}
                </span>
              ) : null}
              <span className={`quick-swipe-lane quick-swipe-lane-away${dragDirection === "away" ? " active" : ""}`}>
                ← {trailingOutcome}
              </span>
            </div>
          ) : null}

          {step === "pick" && dragLabel ? <div className="drag-label">{dragLabel}</div> : null}

          <div className="quick-play-hero">
            <div className="quick-play-stage">
              <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
                {match.statusLabel}
              </span>
              <span className="game-clock">{match.kickoffLabel}</span>
            </div>

            <div className="quick-play-scoreboard quick-play-scoreboard-game">
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

            <div className="quick-play-copyblock">
              <p className="eyebrow quick-play-eyebrow">{step === "pick" ? "Swipe" : "Cerrá la jugada"}</p>
              <h2 className="quick-play-title">
                {step === "pick" ? "Elegí rápido" : selectedOutcome ?? "Tu pick"}
              </h2>
              <p className="quick-play-subtitle">
                {step === "pick"
                  ? "Derecha local. Izquierda visita. Arriba empate."
                  : "Elegí cuántos créditos le cargás a esta jugada."}
              </p>
            </div>
          </div>

          {step === "pick" ? (
            <>
              <div className="quick-gesture-lanes" aria-hidden="true">
                <span>→ {leadingOutcome}</span>
                {drawOutcome ? <span>↑ {drawOutcome}</span> : null}
                <span>← {trailingOutcome}</span>
              </div>

              <div className="quick-play-action-dock">
                <button className="quick-action-button quick-action-skip" type="button" onClick={advanceDeck}>
                  <span>⤼</span>
                </button>
                <button className="quick-action-button quick-action-home" type="button" onClick={() => chooseOutcome(leadingOutcome)}>
                  <span>{match.home.flag}</span>
                </button>
                {drawOutcome ? (
                  <button className="quick-action-button quick-action-draw" type="button" onClick={() => chooseOutcome(drawOutcome)}>
                    <span>X</span>
                  </button>
                ) : null}
                <button className="quick-action-button quick-action-away" type="button" onClick={() => chooseOutcome(trailingOutcome)}>
                  <span>{match.away.flag}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="quick-choice-banner">
                <span className="eyebrow">Tu pick</span>
                <strong>{selectedOutcome}</strong>
                <small>Ahora decí qué tan fuerte entrás.</small>
              </div>

              <div className="quick-intensity-grid quick-intensity-grid-game">
                {INTENSITY_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    className="quick-intensity-button"
                    type="button"
                    onClick={() => savePlay(option.amount)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>

              <div className="quick-play-action-dock quick-play-action-dock-secondary">
                <button className="quick-action-button quick-action-skip" type="button" onClick={resetInteraction}>
                  <span>←</span>
                </button>
                <button className="quick-action-chip" type="button" onClick={() => savePlay(7000)}>
                  Jugármela
                </button>
              </div>
            </>
          )}

          <div className="quick-play-footer">
            <span className="match-state-chip">{step === "pick" ? match.stage : "Cierra al arranque"}</span>
            <span className="quick-play-footer-note">{step === "pick" ? "Tocá o arrastrá" : "Guardá y seguí"}</span>
          </div>

          {nextMatch ? (
            <div className="quick-next-up">
              <span className="eyebrow">Después</span>
              <strong>
                {nextMatch.home.name} vs {nextMatch.away.name}
              </strong>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
