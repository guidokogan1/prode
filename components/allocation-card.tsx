"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";
import { buildWeightedAllocation, MATCH_CREDIT, sumAllocations, validateAllocations } from "@/lib/game";
import { getOutcomeColor } from "@/lib/match-ui";
import { ALLOCATION_EVENT, getStoredAllocation, saveStoredAllocation } from "@/lib/local-store";

type AllocationCardProps = {
  match: MatchViewModel;
};

const QUICK_INTENSITIES = [
  { label: "Suave", amount: 4000 },
  { label: "Media", amount: 5500 },
  { label: "Fuerte", amount: 7000 },
];

export function AllocationCard({ match }: AllocationCardProps) {
  const session = useContext(SessionContext);
  const initialAllocations = useMemo(
    () =>
      match.allocation.map((item, index) => ({
        id: `${match.id}-${index}`,
        code: item.code,
        label: item.label,
        amount: Number(item.amount.replace(/\./g, "")),
      })),
    [match],
  );
  const [allocations, setAllocations] = useState(initialAllocations);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncAllocation = () => {
      const stored = getStoredAllocation(match.id);
      if (stored) {
        setAllocations(
          stored.map((item, index) => ({
            id: `${match.id}-${index}`,
            code: match.allocation[index]?.code ?? match.allocation[0]?.code ?? "home",
            label: item.label,
            amount: item.amount,
          })),
        );
        return;
      }

      setAllocations(initialAllocations);
    };

    syncAllocation();
    window.addEventListener(ALLOCATION_EVENT, syncAllocation);
    window.addEventListener("storage", syncAllocation);

    return () => {
      window.removeEventListener(ALLOCATION_EVENT, syncAllocation);
      window.removeEventListener("storage", syncAllocation);
    };
  }, [initialAllocations, match]);

  const total = sumAllocations(allocations.map((item) => ({ outcomeCode: item.label, amount: item.amount })));
  const remaining = MATCH_CREDIT - total;
  const validation = validateAllocations(allocations.map((item) => ({ outcomeCode: item.label, amount: item.amount })));
  const leadingAllocation = [...allocations].sort((left, right) => right.amount - left.amount)[0] ?? null;

  function updateAmount(index: number, rawValue: string) {
    const nextAmount = Number(rawValue);
    const safeAmount = Number.isFinite(nextAmount) ? Math.max(0, Math.min(7000, nextAmount)) : 0;

    setAllocations((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, amount: safeAmount } : item)),
    );
    setSaveState("idle");
    setSaveMessage(null);
  }

  function applyQuickIntensity(label: string, amount: number) {
    const preset = buildWeightedAllocation(
      allocations.map((item) => item.label),
      label,
      amount,
    );

    setAllocations(
      preset.map((item, index) => ({
        id: `${match.id}-${index}`,
        code: match.allocation[index]?.code ?? match.allocation[0]?.code ?? "home",
        label: item.outcomeCode,
        amount: item.amount,
      })),
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
      setSaveMessage("Este partido ya cerró y no admite cambios.");
      return;
    }

    setSaveState("saving");

    const payload = allocations.map((item) => ({
      code: item.code,
      label: item.label,
      amount: item.amount,
    }));

    saveStoredAllocation(match.id, payload);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: match.id,
          allocations: payload,
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
      setSaveMessage(session?.mode === "remote" ? "Guardado local mientras reconecta." : "Guardado en este dispositivo.");
    }
  }

  return (
    <section
      className={match.isEditable ? "surface-card" : "surface-card-soft"}
      style={{
        padding: 18,
        display: "grid",
        gap: 16,
        background: match.isEditable ? undefined : "rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <p className="eyebrow">{match.isEditable ? "Tu jugada" : "Así entraste"}</p>
          <h2 className="section-title">{match.isEditable ? "Armá la ronda" : "Ronda cerrada"}</h2>
        </div>
        <span className="pill">{match.userStateLabel}</span>
      </div>

      {match.isEditable ? (
        <>
          <div className="surface-card-soft" style={{ padding: "14px 16px", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  {remaining.toLocaleString("es-AR")} cr
                </strong>
                <span className="micro-copy">
                  {leadingAllocation ? `Tu fuerte hoy: ${leadingAllocation.label}` : "Elegí tu lado y cargale fuerte"}
                </span>
              </div>
              <span className="micro-copy">{session?.displayName ? `${session.displayName}` : "Sin sesión remota"}</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {allocations.map((item, index) => (
              <article
                key={item.id}
                className="surface-card-soft"
                style={{
                  padding: 14,
                  borderRadius: 16,
                  borderColor: leadingAllocation?.label === item.label && item.amount > 0 ? `${getOutcomeColor(item.code)}30` : "rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{item.label}</strong>
                    <span className="micro-copy">
                      {leadingAllocation?.label === item.label && item.amount > 0 ? "tu fuerte" : "tope 7.000"}
                    </span>
                  </div>
                  <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
                    {item.amount.toLocaleString("es-AR")}
                  </strong>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {QUICK_INTENSITIES.map((option) => (
                    <button
                      key={`${item.id}-${option.label}`}
                      className="button-secondary"
                      style={{ minHeight: 36, borderRadius: 999, padding: "0 12px", fontSize: ".78rem" }}
                      onClick={() => applyQuickIntensity(item.label, option.amount)}
                      type="button"
                    >
                      {option.label} · {option.amount / 1000}k
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="0"
                  max="7000"
                  step="500"
                  value={item.amount}
                  onChange={(event) => updateAmount(index, event.target.value)}
                  style={{ width: "100%", accentColor: getOutcomeColor(item.code) }}
                  aria-label={item.label}
                />

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
                  <span className="micro-copy">{Math.round((item.amount / MATCH_CREDIT) * 100)}%</span>
                  <span className="micro-copy">step de 500</span>
                </div>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <button className="button-primary" onClick={() => void saveAllocation()} disabled={!validation.ok || saveState === "saving"}>
              {saveState === "saving" ? "Guardando..." : "Guardar ronda"}
            </button>
            {saveMessage ? (
              <span className={saveState === "error" ? "error-copy" : "micro-copy"}>{saveMessage}</span>
            ) : (
              <span className={validation.ok ? "micro-copy" : "error-copy"}>
                {validation.ok ? "Cuando arranca, se revela lo tuyo y lo del grupo." : validation.reason}
              </span>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {allocations.map((item) => (
            <div key={item.id} className="surface-card-soft" style={{ padding: "12px 14px", borderRadius: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong>{item.label}</strong>
                <span className="micro-copy">{Math.round((item.amount / MATCH_CREDIT) * 100)}%</span>
              </div>
              <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{item.amount.toLocaleString("es-AR")}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
