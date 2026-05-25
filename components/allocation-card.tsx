"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";
import { MATCH_CREDIT, formatNetAmount, sumAllocations, validateAllocations } from "@/lib/game";
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
  const leadingOutcome = [...allocations].sort((a, b) => b.amount - a.amount)[0];
  const previewNet = Math.round((leadingOutcome.amount / MATCH_CREDIT) * 5600 - 1400);

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
      <div className="section-title">
        <div>
          <p className="eyebrow">Tu jugada</p>
          <h2>Reparto de 10.000 creditos</h2>
        </div>
        <span className="pill">{match.userStateLabel}</span>
      </div>

      <div className="allocation-grid">
        {allocations.map((item, index) => (
          <div className="allocation-row" key={item.id}>
            <div className="allocation-label">
              <span>{item.label}</span>
              <span>{item.amount.toLocaleString("es-AR")}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.min(100, (item.amount / MATCH_CREDIT) * 100)}%` }}
              />
            </div>
            <div className="allocation-controls">
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
              <input
                className="text-input allocation-number"
                type="number"
                inputMode="numeric"
                min="0"
                max="7000"
                step="500"
                value={item.amount}
                disabled={!match.isEditable}
                onChange={(event) => updateAmount(index, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card allocation-summary">
        <div className="section-title">
          <div>
            <strong>{sessionName ? `${sessionName}, esta seria tu jugada` : "Vista previa"}</strong>
            <p className="subtle">
              Total cargado {total.toLocaleString("es-AR")} · faltan{" "}
              {remaining.toLocaleString("es-AR")}
            </p>
          </div>
          <strong className={previewNet >= 0 ? "money-positive" : "money-negative"}>
            {formatNetAmount(previewNet)}
          </strong>
        </div>
        <p className="subtle">
          Simulacion visual del impacto. El settlement real depende de como se reparta el pozo del
          grupo.
        </p>
      </div>

      <div className="action-row">
        <button
          className="primary-button"
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
        {match.isEditable
          ? validation.ok
            ? "Cada outcome tiene tope de 7.000. Cuando arranca el partido, la jugada se bloquea y se revelan las de todos."
            : validation.reason
          : "Mercado cerrado: ya no podes editar esta jugada."}
      </p>
    </section>
  );
}
