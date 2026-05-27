"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveStoredSession } from "@/lib/local-store";
import type { DemoPersona, DemoPersonaSlug } from "@/lib/mock-data";

type DemoSwitcherProps = {
  activePersona: DemoPersonaSlug;
  personas: DemoPersona[];
};

export function DemoSwitcher({ activePersona, personas }: DemoSwitcherProps) {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState(activePersona);
  const [isPending, startTransition] = useTransition();

  function handleSelect(persona: DemoPersona) {
    if (persona.slug === selectedPersona || isPending) {
      return;
    }

    setSelectedPersona(persona.slug);

    startTransition(async () => {
      await fetch("/api/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ persona: persona.slug }),
      });

      saveStoredSession({
        displayName: persona.name,
        joinedAt: new Date().toISOString(),
      });

      router.refresh();
    });
  }

  const currentPersona = personas.find((persona) => persona.slug === selectedPersona) ?? personas[0];

  return (
    <section className="surface-card-soft" style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <p className="eyebrow">Modo demo</p>
          <h2 className="section-title">Cambiar perfil</h2>
        </div>
        <span className="pill">{isPending ? "cambiando..." : currentPersona.badge}</span>
      </div>

      <p className="muted-copy">Probá estados distintos sin tocar datos reales mientras afinamos la experiencia.</p>

      <div style={{ display: "grid", gap: 10 }}>
        {personas.map((persona) => (
          <button
            key={persona.slug}
            type="button"
            className="surface-card-soft"
            style={{
              padding: 14,
              borderRadius: 18,
              textAlign: "left",
              background: persona.slug === selectedPersona ? "rgba(212,166,75,0.08)" : "rgba(255,255,255,0.03)",
              borderColor: persona.slug === selectedPersona ? "rgba(212,166,75,0.25)" : "rgba(255,255,255,0.06)",
              display: "grid",
              gap: 4,
            }}
            onClick={() => handleSelect(persona)}
          >
            <strong>{persona.name}</strong>
            <span className="micro-copy" style={{ color: persona.slug === selectedPersona ? "#D4A64B" : "#7A9A81" }}>{persona.badge}</span>
            <p className="muted-copy">{persona.summary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
