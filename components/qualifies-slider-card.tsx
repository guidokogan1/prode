"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OutcomePayouts } from "@/components/outcome-payouts";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { creditForMarketType } from "@/lib/game";
import { ALLOCATION_EVENT, buildAllocationScope, saveStoredAllocation } from "@/lib/local-store";
import { getOutcomeColor } from "@/lib/match-ui";

const STEP = 1000;

export function QualifiesSliderCard({ match }: { match: MatchViewModel }) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const allocationScope = buildAllocationScope(session);
  const credit = creditForMarketType(match.marketType);

  const homeOutcome = match.allocation.find((item) => item.code === "home_qualifies") ?? match.allocation[0];
  const awayOutcome = match.allocation.find((item) => item.code === "away_qualifies") ?? match.allocation[1];

  const snap = (value: number) => Math.max(0, Math.min(credit, Math.round(value / STEP) * STEP));
  const hasPick = (homeOutcome?.amount ?? 0) + (awayOutcome?.amount ?? 0) > 0;

  const [homeAmount, setHomeAmount] = useState(hasPick ? snap(homeOutcome?.amount ?? credit / 2) : snap(credit / 2));
  const [editing, setEditing] = useState(match.isEditable && !hasPick);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

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
    setHomeAmount(snap(fraction * credit));
    if (saveState !== "idle") {
      setSaveState("idle");
      setSaveMessage(null);
    }
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/matches");
  }

  async function confirm() {
    if (!homeOutcome || !awayOutcome) return;
    setSaveState("saving");
    const payload = [
      { code: homeOutcome.code, label: homeOutcome.label, amount: homeAmount },
      { code: awayOutcome.code, label: awayOutcome.label, amount: awayAmount },
    ];
    saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: "draft" });

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, allocations: payload }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string; state?: string };
      if (!response.ok || !result.ok) {
        saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: "sync_error" });
        setSaveState("error");
        setSaveMessage(result.reason ?? "No se pudo guardar la jugada.");
        return;
      }
      saveStoredAllocation(allocationScope, match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: result.state === "saved_remote" ? "saved_remote" : "saved_local",
      });
      if (typeof window !== "undefined") window.dispatchEvent(new Event(ALLOCATION_EVENT));
      setSaveState("saved");
      setEditing(false);
      if (result.state === "saved_remote") router.refresh();
    } catch {
      saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: "sync_error" });
      setSaveState("saved");
      setEditing(false);
    }
  }

  const sliderFooter = (
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
          onClick={() => setHomeAmount((current) => snap(current + STEP))}
        >
          <span style={{ fontSize: "1.1rem" }}>{match.home.flag}</span> +1.000
        </button>
        <button
          type="button"
          className="button-secondary"
          style={{ flex: 1, gap: 8 }}
          onClick={() => setHomeAmount((current) => snap(current - STEP))}
        >
          +1.000 <span style={{ fontSize: "1.1rem" }}>{match.away.flag}</span>
        </button>
      </div>

      <button type="button" className="button-primary" style={{ width: "100%" }} onClick={() => void confirm()} disabled={saveState === "saving"}>
        {saveState === "saving" ? "Guardando…" : "Confirmar jugada"}
      </button>
      {saveState === "error" && saveMessage ? <span className="micro-copy" style={{ color: "var(--live)" }}>{saveMessage}</span> : null}
    </div>
  );

  return (
    <section className="section-stack-lg">
      <div style={{ paddingInline: 4 }}>
        <button className="button-secondary" onClick={handleBack} type="button" style={{ minHeight: 42, borderRadius: 999, paddingInline: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
      </div>

      {editing ? (
        <div className="surface-card">
          <VoteFace match={match} showDrawGesture={false} centerMode="vs" topRightLabel={match.statusLabel} footerSlot={sliderFooter} />
        </div>
      ) : (
        <div className="surface-card" style={{ padding: 20, display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
          <p className="eyebrow">Esta es tu jugada</p>
          <div style={{ width: "100%", height: 14, borderRadius: 8, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${homePct}%`, background: homeFill }} />
            <div style={{ width: `${100 - homePct}%`, background: awayFill }} />
          </div>
          <div className="split-row" style={{ width: "100%" }}>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.3rem", color: homeText }}>{match.home.flag} {formatCredits(homeAmount)}</strong>
            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.3rem", color: awayText }}>{formatCredits(awayAmount)} {match.away.flag}</strong>
          </div>
          {match.isEditable ? (
            <button type="button" className="button-secondary" style={{ width: "100%", justifyContent: "center", minHeight: 46 }} onClick={() => setEditing(true)}>
              Cambiar jugada
            </button>
          ) : (
            <span className="micro-copy">Este partido ya cerró.</span>
          )}
        </div>
      )}

      <OutcomePayouts match={match} />
    </section>
  );
}
