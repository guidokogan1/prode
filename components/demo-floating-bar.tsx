"use client";

import { useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import type { DemoPersona, DemoPersonaSlug } from "@/lib/mock-data";

type DemoFloatingBarProps = {
  activePersona: DemoPersonaSlug;
  personas: DemoPersona[];
};

export function DemoFloatingBar({ activePersona, personas }: DemoFloatingBarProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const [selectedPersona, setSelectedPersona] = useState(activePersona);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (session?.appMode !== "demo") {
    return null;
  }

  const currentPersona = personas.find((persona) => persona.slug === selectedPersona) ?? personas[0];

  function handleSelect(persona: DemoPersona) {
    if (persona.slug === selectedPersona || isPending) {
      setOpen(false);
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

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="demo-floating-bar">
      <div
        className="surface-card-soft"
        style={{
          padding: 12,
          display: "grid",
          gap: 10,
          background: "rgba(10,21,12,0.92)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
        }}
      >
        <button
          type="button"
          className="button-ghost"
          style={{
            justifyContent: "space-between",
            width: "100%",
            minHeight: 42,
            borderRadius: 14,
            paddingInline: 12,
            background: "rgba(255,255,255,0.03)",
          }}
          onClick={() => setOpen((value) => !value)}
        >
          <span style={{ display: "grid", justifyItems: "start", gap: 2 }}>
            <span className="micro-copy">Demo</span>
            <strong style={{ color: "#EDE8D9" }}>{currentPersona.name}</strong>
          </span>
          <span className="micro-copy">{isPending ? "cambiando..." : currentPersona.badge}</span>
        </button>

        {open ? (
          <div style={{ display: "grid", gap: 8 }}>
            {personas.map((persona) => {
              const selected = persona.slug === selectedPersona;
              return (
                <button
                  key={persona.slug}
                  type="button"
                  className="button-ghost"
                  onClick={() => handleSelect(persona)}
                  style={{
                    width: "100%",
                    minHeight: 52,
                    borderRadius: 14,
                    paddingInline: 12,
                    justifyContent: "space-between",
                    background: selected ? "rgba(212,166,75,0.08)" : "rgba(255,255,255,0.03)",
                    borderColor: selected ? "rgba(212,166,75,0.24)" : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ display: "grid", justifyItems: "start", gap: 2 }}>
                    <strong style={{ color: selected ? "#D8B56A" : "#EDE8D9" }}>{persona.name}</strong>
                    <span className="micro-copy">{persona.summary}</span>
                  </span>
                  <span className="micro-copy" style={{ color: selected ? "#D8B56A" : "#667D69" }}>
                    {selected ? "Activo" : persona.badge}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
