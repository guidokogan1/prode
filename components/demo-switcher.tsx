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
        pin: "0000",
        joinedAt: new Date().toISOString(),
      });

      router.refresh();
    });
  }

  const currentPersona = personas.find((persona) => persona.slug === selectedPersona) ?? personas[0];

  return (
    <section className="card card-grid">
      <div className="section-title section-title-compact">
        <div>
          <p className="eyebrow">Modo demo</p>
          <h2>Cambiar perfil</h2>
        </div>
        <span className="pill">{isPending ? "Cambiando..." : currentPersona.badge}</span>
      </div>

      <p className="subtle">Sirve para revisar estados distintos sin tocar datos reales.</p>

      <div className="demo-grid">
        {personas.map((persona) => (
          <button
            key={persona.slug}
            type="button"
            className={`demo-card${persona.slug === selectedPersona ? " active" : ""}`}
            onClick={() => handleSelect(persona)}
          >
            <strong>{persona.name}</strong>
            <span>{persona.badge}</span>
            <p>{persona.summary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
