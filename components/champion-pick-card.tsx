"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import type { SessionState } from "@/lib/domain";
import { CHAMPION_EVENT, getStoredChampionPick, saveStoredChampionPick } from "@/lib/local-store";

type ChampionOption = {
  name: string;
  flag: string;
  groupLabel?: string;
};

type ChampionPickCardProps = {
  initialPick: string | null;
  teams: ChampionOption[];
  locked: boolean;
  mode: "summary" | "checklist";
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

export function ChampionPickCard({ initialPick, teams, locked, mode }: ChampionPickCardProps) {
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

  const groupedTeams = useMemo(() => {
    const groups = new Map<string, ChampionOption[]>();
    for (const team of teams) {
      const key = team.groupLabel ?? "Eliminatorias";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(team);
    }

    return [...groups.entries()]
      .map(([label, entries]) => ({
        label,
        teams: entries.sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [teams]);

  const selectedOption = useMemo(
    () => teams.find((team) => team.name === selectedTeam) ?? null,
    [selectedTeam, teams],
  );

  async function handleSave() {
    if (!selectedTeam || locked) {
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
        router.push("/");
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
      router.push("/");
      return;
    }

    setSaveMessage("Entrá para guardar.");
    setIsSaving(false);
  }

  if (mode === "summary") {
    return (
      <section className="surface-card-soft panel-stack">
        <div className="title-stack">
          <p className="eyebrow">Campeón</p>
          <h2 className="section-title">
            {selectedOption ? `${selectedOption.flag} ${selectedOption.name}` : "Sin elegir"}
          </h2>
          <p className="muted-copy">{locked ? "Ya quedó cerrado." : "Podés cambiarlo hasta que arranque el Mundial."}</p>
        </div>

        {!locked ? (
          <Link className="button-secondary" href="/champion">
            {selectedTeam ? "Editar campeón" : "Elegir campeón"}
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="section-stack" style={{ gap: 18 }}>
      <div className="title-stack">
        <p className="eyebrow">Campeón</p>
        <h1 className="display-title">Elegí campeón</h1>
        <p className="muted-copy">{locked ? "Ya no se puede cambiar." : "Elegí uno antes de que arranque el Mundial."}</p>
      </div>

      <section
        className="surface-card-soft"
        style={{
          padding: 18,
          display: "grid",
          gap: 8,
        }}
      >
        <span className="eyebrow">{selectedOption ? "Tu campeón" : "Sin elegir"}</span>
        <strong style={{ fontSize: "1.2rem", color: "#EDE8D9" }}>
          {selectedOption ? `${selectedOption.flag} ${selectedOption.name}` : "Elegí uno para arrancar"}
        </strong>
        <span className="micro-copy">
          {locked ? "Quedó cerrado." : "Después lo podés editar desde tu perfil hasta que arranque el Mundial."}
        </span>
      </section>

      {groupedTeams.map((group) => (
        <section key={group.label} className="section-stack" style={{ gap: 12 }}>
          <div className="split-row" style={{ alignItems: "center" }}>
            <p className="eyebrow">{group.label}</p>
            <span className="micro-copy">{group.teams.length} equipos</span>
          </div>
          <div className="compact-grid-2">
            {group.teams.map((team) => {
              const selected = selectedTeam === team.name;
              return (
                <button
                  key={team.name}
                  type="button"
                  className={selected ? "button-secondary" : "button-ghost"}
                  disabled={locked}
                  onClick={() => setSelectedTeam(team.name)}
                  style={{
                    minHeight: 72,
                    borderRadius: 16,
                    border: selected ? "1px solid rgba(212,166,75,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    background: selected ? "linear-gradient(160deg, rgba(212,166,75,0.16) 0%, rgba(212,166,75,0.08) 100%)" : "rgba(255,255,255,0.03)",
                    justifyContent: "space-between",
                    paddingInline: 14,
                    gap: 10,
                    boxShadow: selected ? "0 0 0 1px rgba(212,166,75,0.08), 0 14px 28px rgba(0,0,0,0.22)" : "none",
                    transform: selected ? "translateY(-1px)" : "none",
                    transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.3rem" }}>{team.flag}</span>
                    <span style={{ color: selected ? "#F4E3B2" : "#EDE8D9", fontWeight: selected ? 700 : 600 }}>{team.name}</span>
                  </span>
                  <span
                    className="micro-copy"
                    style={{
                      color: selected ? "#F0C96B" : "#667D69",
                      fontWeight: 700,
                    }}
                  >
                    {selected ? "Elegido" : "Elegir"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {!locked && selectedOption ? (
        <section
          className="surface-card-soft"
          style={{
            position: "sticky",
            bottom: "calc(var(--safe-bottom) + 12px)",
            padding: 18,
            display: "grid",
            gap: 12,
            background: "linear-gradient(160deg, rgba(17,32,21,0.96) 0%, rgba(10,21,12,0.96) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
            backdropFilter: "blur(12px)",
            zIndex: 6,
          }}
        >
          <div className="split-row" style={{ alignItems: "center" }}>
            <div className="title-stack">
              <span className="eyebrow">Listo para guardar</span>
              <strong style={{ fontSize: "1rem", color: "#EDE8D9" }}>
                {selectedOption.flag} {selectedOption.name}
              </strong>
            </div>
            {saveMessage ? <span className="micro-copy">{saveMessage}</span> : null}
          </div>

          <button className="button-primary" disabled={isSaving} onClick={() => void handleSave()} type="button">
            {isSaving ? "Guardando..." : "Guardar campeón"}
          </button>
        </section>
      ) : null}
    </section>
  );
}
