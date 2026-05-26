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
  const progress = `${index + 1} / ${deck.length}`;
  const canDraw = match.allocation.length === 3;

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
      chooseOutcome(match.allocation[0]?.label ?? "");
      return;
    }

    if (drag.x < -110) {
      chooseOutcome(match.allocation[match.allocation.length - 1]?.label ?? "");
      return;
    }

    if (canDraw && drag.y < -110) {
      chooseOutcome(match.allocation[1]?.label ?? "");
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
        ? match.allocation[1]?.label
        : drag.x > 80
          ? match.allocation[0]?.label
          : drag.x < -80
            ? match.allocation[match.allocation.length - 1]?.label
            : null
      : null;

  return (
    <section className="quick-play">
      <article
        className={`card quick-play-card quick-play-card-${step}`}
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
        <div className="quick-play-topline">
          <div>
            <p className="eyebrow quick-play-eyebrow">{step === "pick" ? "Ronda rápida" : "Ahora sí"}</p>
            <h2 className="quick-play-title">
              {step === "pick" ? "¿Qué sale?" : selectedOutcome ?? "Tu pick"}
            </h2>
          </div>
          <span className="quick-play-progress">{progress}</span>
        </div>

        {step === "pick" && dragLabel ? <div className="drag-label">{dragLabel}</div> : null}

        <div className="quick-play-stage">
          <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="game-clock">{match.kickoffLabel}</span>
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

        {step === "pick" ? (
          <>
            <p className="quick-play-subtitle">Deslizá o tocá uno. Después elegís cuánto.</p>
            <div className="quick-pick-grid quick-pick-grid-3">
              {match.allocation.map((item) => (
                <button
                  key={item.label}
                  className="quick-pick-button"
                  type="button"
                  onClick={() => chooseOutcome(item.label)}
                >
                  <span className="quick-pick-side">
                    <span className="quick-pick-mark" aria-hidden="true" />
                    <span className="quick-pick-label">{item.label}</span>
                  </span>
                  <span className="quick-pick-helper">Elegir</span>
                </button>
              ))}
            </div>

            <div className="gesture-hint-row">
              <span>→ {match.allocation[0]?.label}</span>
              {canDraw ? <span>↑ {match.allocation[1]?.label}</span> : null}
              <span>← {match.allocation[match.allocation.length - 1]?.label}</span>
            </div>
          </>
        ) : (
          <>
            <p className="quick-play-subtitle">Marcá si vas fuerte, media o suave.</p>
            <div className="quick-intensity-grid">
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
          </>
        )}

        <div className="quick-play-footer">
          <span className="match-state-chip">{step === "pick" ? match.stage : "Guarda y sigue"}</span>
          <button
            className="text-link-button"
            type="button"
            onClick={step === "pick" ? advanceDeck : resetInteraction}
          >
            {step === "pick" ? (isLast ? "Volver" : "Saltá este") : "Cambiar pick"}
          </button>
        </div>
      </article>
    </section>
  );
}
