"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { SessionContext } from "@/components/session-provider";
import type { MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import { buildBalancedAllocation, buildWeightedAllocation, MATCH_CREDIT, OUTCOME_CAP, sumAllocations, validateAllocations } from "@/lib/game";
import { getOutcomeColor, getPickStateLabel } from "@/lib/match-ui";
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
        amount: item.amount,
      })),
    [match],
  );
  const [allocations, setAllocations] = useState(initialAllocations);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncAllocation = () => {
      const storedDraft = getStoredAllocation(match.id);
      if (storedDraft?.allocations?.length) {
        setAllocations(
          storedDraft.allocations.map((item, index) => ({
            id: `${match.id}-${index}`,
            code: match.allocation[index]?.code ?? match.allocation[0]?.code ?? "home",
            label: item.label,
            amount: item.amount,
          })),
        );
        setSaveMessage(
          storedDraft.status === "saved_remote"
            ? "Guardado"
            : storedDraft.status === "saved_local"
              ? "Guardado local"
              : storedDraft.status === "sync_error"
                ? "Error"
                : null,
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
  const remainingTone = remaining === 0 ? "#3D9B5F" : remaining > 0 ? "#D4A64B" : "#E8413A";
  const remainingLabel = remaining === 0 ? "Listo" : remaining > 0 ? `Faltan ${formatCredits(remaining)}` : `Sobran ${formatCredits(Math.abs(remaining))}`;

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

  function applyBalancedAllocation() {
    const preset = buildBalancedAllocation(allocations.map((item) => item.label));

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

    saveStoredAllocation(match.id, {
      allocations: payload,
      savedAt: new Date().toISOString(),
      status: "draft",
    });

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

      const result = (await response.json()) as { ok: boolean; message?: string; reason?: string; state?: string };

      if (!response.ok || !result.ok) {
        saveStoredAllocation(match.id, {
          allocations: payload,
          savedAt: new Date().toISOString(),
          status: "sync_error",
        });
        setSaveState("error");
        setSaveMessage(result.reason ?? "No se pudo guardar la jugada.");
        return;
      }

      saveStoredAllocation(match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: result.state === "saved_remote" ? "saved_remote" : "saved_local",
      });
      setSaveState("saved");
      setSaveMessage(result.state === "saved_remote" ? "Guardado" : "Guardado local");
    } catch {
      saveStoredAllocation(match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveState("saved");
      setSaveMessage(session?.kind === "remote" ? "Guardado local" : "Guardado local");
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
          <p className="eyebrow">Tu jugada</p>
          <h2 className="section-title">{match.isEditable ? "Repartí 10.000" : "Distribución"}</h2>
        </div>
        <span className="pill">{getPickStateLabel(match)}</span>
      </div>

      {match.isEditable ? (
        <>
          <div className="surface-card-soft" style={{ padding: "14px 16px", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.24rem", letterSpacing: "-0.04em" }}>
                  {formatCredits(total)} / {formatCredits(MATCH_CREDIT)}
                </strong>
                <span className="micro-copy" style={{ color: remainingTone }}>{remainingLabel}</span>
              </div>
              <span className="micro-copy">{session?.displayName ?? "Sin sesión"}</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button-secondary" style={{ minHeight: 36, borderRadius: 999, padding: "0 12px", fontSize: ".74rem" }} onClick={applyBalancedAllocation} type="button">
                Balanceado
              </button>
              <span className="micro-copy" style={{ alignSelf: "center" }}>Máx. {formatCredits(OUTCOME_CAP)}</span>
            </div>
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
                    <span className="micro-copy">{leadingAllocation?.label === item.label && item.amount > 0 ? "principal" : "tope 7.000"}</span>
                  </div>
                  <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-accent)", fontSize: "1.18rem", letterSpacing: "-0.04em" }}>
                    {formatCredits(item.amount)}
                  </strong>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {QUICK_INTENSITIES.map((option) => (
                    <button
                      key={`${item.id}-${option.label}`}
                      className="button-secondary"
                      style={{ minHeight: 36, borderRadius: 999, padding: "0 12px", fontSize: ".74rem" }}
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
              {saveState === "saving" ? "Guardando..." : "Guardar"}
            </button>
            {saveMessage ? (
              <span className={saveState === "error" ? "error-copy" : "micro-copy"}>{saveMessage}</span>
            ) : (
              <span className={validation.ok ? "micro-copy" : "error-copy"}>
                {validation.ok ? "Listo para guardar" : validation.reason}
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
              <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-accent)", fontSize: "1.14rem", letterSpacing: "-0.04em" }}>{formatCredits(item.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
