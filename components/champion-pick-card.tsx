"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import type { SessionState } from "@/lib/domain";
import {
  CHAMPION_EVENT,
  getStoredChampionPick,
  saveStoredChampionPick,
} from "@/lib/local-store";

type ChampionOption = {
  name: string;
  flag: string;
};

type ChampionPickCardProps = {
  initialPick: string | null;
  teams: ChampionOption[];
};

function buildChampionScope(session: SessionState | null) {
  if (session?.kind === "demo") {
    return `demo:${session.demoPersonaSlug ?? "default"}`;
  }

  if (session?.kind === "local") {
    return `local:${session.displayName ?? "guest"}`;
  }

  return null;
}

export function ChampionPickCard({ initialPick, teams }: ChampionPickCardProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const [selectedTeam, setSelectedTeam] = useState(initialPick ?? "");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const localScope = useMemo(() => buildChampionScope(session), [session]);

  useEffect(() => {
    if (!localScope) {
      setSelectedTeam(initialPick ?? "");
      return;
    }

    const sync = () => {
      const stored = getStoredChampionPick(localScope);
      setSelectedTeam(stored?.teamName ?? initialPick ?? "");
    };

    sync();
    window.addEventListener(CHAMPION_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CHAMPION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [initialPick, localScope]);

  async function handleSave() {
    if (!selectedTeam) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("Guardando");

    if (session?.kind === "remote") {
      try {
        const response = await fetch("/api/champion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamName: selectedTeam }),
        });

        const result = (await response.json()) as { ok?: boolean; reason?: string };
        if (!response.ok || !result.ok) {
          setSaveMessage(result.reason ?? "No se pudo guardar.");
          setIsSaving(false);
          return;
        }

        setSaveMessage("Guardado");
        setIsSaving(false);
        router.refresh();
        return;
      } catch {
        setSaveMessage("No se pudo guardar.");
        setIsSaving(false);
        return;
      }
    }

    if (localScope) {
      saveStoredChampionPick(localScope, {
        teamName: selectedTeam,
        savedAt: new Date().toISOString(),
      });
      setSaveMessage("Guardado local");
      setIsSaving(false);
      return;
    }

    setSaveMessage("Entrá para guardar.");
    setIsSaving(false);
  }

  return (
    <section className="surface-card-soft panel-stack">
      <div className="title-stack">
        <p className="eyebrow">Campeón</p>
        <h2 className="section-title">Elegí campeón</h2>
        <p className="muted-copy">Una sola apuesta para todo el Mundial.</p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <select
          value={selectedTeam}
          onChange={(event) => setSelectedTeam(event.target.value)}
          style={{
            minHeight: 48,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "#EDE8D9",
            paddingInline: 14,
          }}
        >
          <option value="" style={{ color: "#091409" }}>
            Elegí un equipo
          </option>
          {teams.map((team) => (
            <option key={team.name} value={team.name} style={{ color: "#091409" }}>
              {team.flag} {team.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="button-primary" disabled={!selectedTeam || isSaving} onClick={() => void handleSave()} type="button">
            {isSaving ? "Guardando..." : "Guardar campeón"}
          </button>
          {saveMessage ? <span className="micro-copy">{saveMessage}</span> : null}
        </div>
      </div>
    </section>
  );
}
