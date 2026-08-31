"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { groupMatchesByDay, type FechaGroup } from "@/lib/fechas";

type FechaBrowserProps = {
  fechas: FechaGroup[];
  initialIndex: number;
};

export function FechaBrowser({ fechas, initialIndex }: FechaBrowserProps) {
  const [index, setIndex] = useState(initialIndex);
  const fecha = fechas[index];
  const days = useMemo(() => groupMatchesByDay(fecha.matches), [fecha]);

  if (!fecha) return null;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          aria-label="Fecha anterior"
          className="matches-cruces-btn"
          style={{ opacity: index === 0 ? 0.35 : 1 }}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ position: "relative", textAlign: "center", display: "grid", gap: 2 }}>
          <p className="eyebrow">Temporada</p>
          <h2
            className="section-title"
            style={{ fontSize: "1.1rem", display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center" }}
          >
            Fecha {fecha.number}
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </h2>
          <span className="micro-copy">
            {fecha.startLabel} — {fecha.endLabel}
          </span>
          <select
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            aria-label="Elegir fecha"
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            {fechas.map((option, optionIndex) => (
              <option key={option.number} value={optionIndex}>
                {`Fecha ${option.number} · ${option.startLabel} — ${option.endLabel}`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(fechas.length - 1, current + 1))}
          disabled={index === fechas.length - 1}
          aria-label="Fecha siguiente"
          className="matches-cruces-btn"
          style={{ opacity: index === fechas.length - 1 ? 0.35 : 1 }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {days.map((day) => (
        <div key={day.key} style={{ display: "grid", gap: 10 }}>
          <div className="split-row" style={{ alignItems: "center", gap: 12 }}>
            <span className="micro-copy" style={{ fontWeight: 700, letterSpacing: ".06em" }}>
              {day.label}
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {day.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
