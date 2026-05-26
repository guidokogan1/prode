"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";
import { MATCH_CREDIT, sumAllocations, validateAllocations } from "@/lib/game";
import { ALLOCATION_EVENT, getStoredAllocation, getStoredSession, saveStoredAllocation } from "@/lib/local-store";

type AllocationCardProps = {
  match: MatchViewModel;
};

export function AllocationCard({ match }: AllocationCardProps) {
  const session = useContext(SessionContext);
  const initialAllocations = useMemo(
    () =>
      match.allocation.map((item, index) => ({
        id: `${match.id}-${index}`,
        label: item.label,
        amount: Number(item.amount.replace(".", "")),
      })),
    [match],
  );
  const [allocations, setAllocations] = useState(initialAllocations);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const sessionName = session?.displayName ?? getStoredSession()?.displayName ?? null;

  useEffect(() => {
    const syncAllocation = () => {
      const stored = getStoredAllocation(match.id);
      if (stored) {
        setAllocations(
          stored.map((item, index) => ({
            id: `${match.id}-${index}`,
            label: item.label,
            amount: item.amount,
          })),
        );
      } else {
        setAllocations(initialAllocations);
      }
    };

    syncAllocation();

    window.addEventListener(ALLOCATION_EVENT, syncAllocation);
    window.addEventListener("storage", syncAllocation);

    return () => {
      window.removeEventListener(ALLOCATION_EVENT, syncAllocation);
      window.removeEventListener("storage", syncAllocation);
    };
  }, [initialAllocations, match.id]);

  const total = sumAllocations(
    allocations.map((item) => ({
      outcomeCode: item.label,
      amount: item.amount,
    })),
  );
  const remaining = MATCH_CREDIT - total;
  const validation = validateAllocations(
    allocations.map((item) => ({
      outcomeCode: item.label,
      amount: item.amount,
    })),
  );

  function updateAmount(index: number, rawValue: string) {
    const nextAmount = Number(rawValue);
    const safeAmount = Number.isFinite(nextAmount) ? Math.max(0, Math.min(7000, nextAmount)) : 0;

    setAllocations((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, amount: safeAmount } : item,
      ),
    );
    setSaveState("idle");
    setSaveMessage(null);
  }

  function nudgeAmount(index: number, delta: number) {
    const current = allocations[index];
    if (!current) {
      return;
    }

    updateAmount(index, String(current.amount + delta));
  }

  function maxAmount(index: number) {
    updateAmount(index, "7000");
  }

  async function saveAllocation() {
    if (!validation.ok) {
      return;
    }

    if (!match.isEditable) {
      setSaveState("error");
      setSaveMessage("Este partido ya cerro y no admite cambios.");
      return;
    }

    if (!sessionName) {
      setSaveState("error");
      setSaveMessage("Primero tenes que entrar con nombre + PIN.");
      return;
    }

    setSaveState("saving");

    saveStoredAllocation(
      match.id,
      allocations.map((item) => ({
        label: item.label,
        amount: item.amount,
      })),
    );

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: match.id,
          allocations: allocations.map((item) => ({
            label: item.label,
            amount: item.amount,
          })),
          displayName: sessionName,
        }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        reason?: string;
      };

      if (!response.ok || !result.ok) {
        setSaveState("error");
        setSaveMessage(result.reason ?? "No se pudo guardar la jugada.");
        return;
      }

      setSaveState("saved");
      setSaveMessage(result.message ?? "Jugada guardada.");
    } catch {
      setSaveState("saved");
      setSaveMessage("Guardado en este dispositivo.");
    }
  }

  return (
    <section className="card allocation-card card-grid">
      <div className="section-title section-title-compact">
        <div>
          <p className="eyebrow">{match.isEditable ? "Tu jugada" : "Así entraste"}</p>
          <h2>{match.isEditable ? "Repartí 10.000 créditos" : "Tu ronda quedó cerrada"}</h2>
        </div>
        <span className="match-state-chip">{match.userStateLabel}</span>
      </div>

      {match.isEditable ? (
        <>
          <div className="allocation-grid">
            {allocations.map((item, index) => (
              <div className="allocation-row" key={item.id}>
                <div className="allocation-label">
                  <span>{item.label}</span>
                  <strong>{item.amount.toLocaleString("es-AR")}</strong>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.min(100, (item.amount / MATCH_CREDIT) * 100)}%` }}
                  />
                </div>
                <div className="allocation-controls">
                  <div className="allocation-stepper">
                    <button
                      className="mini-button"
                      type="button"
                      disabled={!match.isEditable}
                      onClick={() => nudgeAmount(index, -500)}
                    >
                      -500
                    </button>
                    <button
                      className="mini-button mini-button-strong"
                      type="button"
                      disabled={!match.isEditable}
                      onClick={() => maxAmount(index)}
                    >
                      7k
                    </button>
                    <button
                      className="mini-button"
                      type="button"
                      disabled={!match.isEditable}
                      onClick={() => nudgeAmount(index, 500)}
                    >
                      +500
                    </button>
                  </div>
                  <input
                    className="allocation-input"
                    type="range"
                    min="0"
                    max="7000"
                    step="500"
                    value={item.amount}
                    disabled={!match.isEditable}
                    onChange={(event) => updateAmount(index, event.target.value)}
                    aria-label={item.label}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="allocation-summary simple-summary">
            <strong>{sessionName ? `${sessionName}, te faltan` : "Te faltan"}</strong>
            <span className={remaining === 0 ? "money-positive" : ""}>
              {remaining.toLocaleString("es-AR")} créditos
            </span>
          </div>

          <div className="action-row">
            <button
              className="primary-button primary-button-wide"
              disabled={!validation.ok || saveState === "saving" || !match.isEditable}
              onClick={saveAllocation}
            >
              {saveState === "saving" ? "Guardando..." : "Guardar jugada"}
            </button>
            {saveState === "saved" || saveState === "error" ? (
              <span className={saveState === "error" ? "error-copy" : "subtle"}>{saveMessage}</span>
            ) : null}
          </div>

          <p className="hint">
            {validation.ok
              ? "Tope 7.000 por opción. Arranca el partido y se revela todo."
              : validation.reason}
          </p>
        </>
      ) : (
        <>
          <div className="locked-allocation-grid">
            {allocations.map((item) => (
              <div className="locked-allocation-card" key={item.id}>
                <span>{item.label}</span>
                <strong>{item.amount.toLocaleString("es-AR")}</strong>
                <small>{Math.round((item.amount / MATCH_CREDIT) * 100)}%</small>
              </div>
            ))}
          </div>

          <div className="allocation-summary simple-summary locked-summary">
            <strong>{sessionName ? `${sessionName}, ya quedó` : "Jugada cerrada"}</strong>
            <span>Se revela junto al grupo</span>
          </div>

          <p className="hint">Ya no podés editar esta ronda.</p>
        </>
      )}
    </section>
  );
}
