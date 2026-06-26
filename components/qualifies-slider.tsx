"use client";

import { useRef } from "react";
import { VoteFace } from "@/components/vote-face";
import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { getOutcomeColor } from "@/lib/match-ui";

const STEP = 1000;

type QualifiesSliderFooterProps = {
  match: MatchViewModel;
  credit: number;
  homeAmount: number;
  onHomeAmountChange: (amount: number) => void;
  onConfirm: () => void;
  saving?: boolean;
  errorMessage?: string | null;
  confirmLabel?: string;
};

export function QualifiesSliderFooter({
  match,
  credit,
  homeAmount,
  onHomeAmountChange,
  onConfirm,
  saving = false,
  errorMessage = null,
  confirmLabel = "Confirmar jugada",
}: QualifiesSliderFooterProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const snap = (value: number) => Math.max(0, Math.min(credit, Math.round(value / STEP) * STEP));
  const awayAmount = credit - homeAmount;
  const homePct = Math.round((homeAmount / credit) * 100);

  const PICK = getOutcomeColor("home_qualifies");
  const GRAY_TEXT = "var(--text-tertiary)";
  const GRAY_FILL = "rgba(255,255,255,0.18)";
  const homeIsPick = homeAmount >= awayAmount;
  const homeFill = homeIsPick ? PICK : GRAY_FILL;
  const awayFill = homeIsPick ? GRAY_FILL : PICK;
  const homeText = homeIsPick ? PICK : GRAY_TEXT;
  const awayText = homeIsPick ? GRAY_TEXT : PICK;

  function setFromClientX(clientX: number) {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onHomeAmountChange(snap(fraction * credit));
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="split-row" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.9rem", lineHeight: 0.9, letterSpacing: "-0.02em", color: homeText, transition: "color .2s", fontVariantNumeric: "tabular-nums" }}>{formatCredits(homeAmount)}</strong>
          <span className="micro-copy">{homePct}%</span>
        </div>
        <div style={{ display: "grid", gap: 2, textAlign: "right", justifyItems: "end" }}>
          <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.9rem", lineHeight: 0.9, letterSpacing: "-0.02em", color: awayText, transition: "color .2s", fontVariantNumeric: "tabular-nums" }}>{formatCredits(awayAmount)}</strong>
          <span className="micro-copy">{100 - homePct}%</span>
        </div>
      </div>

      <div
        className="qbar"
        ref={barRef}
        onPointerDown={(event) => {
          if (!match.isEditable) return;
          draggingRef.current = true;
          try {
            barRef.current?.setPointerCapture(event.pointerId);
          } catch {}
          setFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          event.preventDefault();
          setFromClientX(event.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={credit}
        aria-valuenow={homeAmount}
        aria-label={`Reparto entre ${match.home.name} y ${match.away.name}`}
      >
        <div className="qbar-fill" style={{ width: `${homePct}%`, background: homeFill }} />
        <div className="qbar-fill" style={{ width: `${100 - homePct}%`, background: awayFill }} />
        <div className="qbar-knob" style={{ left: `${homePct}%` }}>
          <i />
          <i />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="button-secondary"
          style={{ flex: 1, gap: 8 }}
          onClick={() => onHomeAmountChange(snap(homeAmount + STEP))}
        >
          <span style={{ fontSize: "1.1rem" }}>{match.home.flag}</span> +1.000
        </button>
        <button
          type="button"
          className="button-secondary"
          style={{ flex: 1, gap: 8 }}
          onClick={() => onHomeAmountChange(snap(homeAmount - STEP))}
        >
          +1.000 <span style={{ fontSize: "1.1rem" }}>{match.away.flag}</span>
        </button>
      </div>

      <button type="button" className="button-primary" style={{ width: "100%" }} onClick={onConfirm} disabled={saving}>
        {saving ? "Guardando…" : confirmLabel}
      </button>
      {errorMessage ? <span className="micro-copy" style={{ color: "var(--live)" }}>{errorMessage}</span> : null}
    </div>
  );
}

type QualifiesVoteCardProps = {
  match: MatchViewModel;
  credit: number;
  homeAmount: number;
  onHomeAmountChange: (amount: number) => void;
  onConfirm: () => void;
  topRightLabel?: string;
  saving?: boolean;
  errorMessage?: string | null;
  confirmLabel?: string;
};

export function QualifiesVoteCard({ match, topRightLabel, ...footerProps }: QualifiesVoteCardProps) {
  return (
    <div className="surface-card">
      <VoteFace
        match={match}
        showDrawGesture={false}
        centerMode="vs"
        topRightLabel={topRightLabel ?? match.statusLabel}
        footerSlot={<QualifiesSliderFooter match={match} {...footerProps} />}
      />
    </div>
  );
}
