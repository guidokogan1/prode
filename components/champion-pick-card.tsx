"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionContext } from "@/components/session-provider";
import type { SessionState } from "@/lib/domain";
import {
  CHAMPION_EVENT,
  clearPendingChampionPick,
  getPendingChampionPick,
  getStoredChampionPick,
  saveStoredChampionPick,
  setPendingChampionPick,
} from "@/lib/local-store";

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

  useEffect(() => {
    if (session?.kind !== "remote" || locked) {
      return;
    }

    const pending = getPendingChampionPick();
    if (!pending?.teamName) {
      return;
    }

    const isValidTeam = teams.some((team) => team.name === pending.teamName);
    if (!isValidTeam) {
      clearPendingChampionPick();
      return;
    }

    clearPendingChampionPick();
    setSelectedTeam(pending.teamName);
    void fetch("/api/champion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: pending.teamName }),
    }).then(() => router.refresh());
  }, [session, locked, teams, router]);

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

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedTeam || locked || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    let currentSession = session;
    if (!currentSession) {
      for (let i = 0; i < 25; i += 1) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const r = await fetch("/api/session", { credentials: "include", cache: "no-store" });
          const body = (await r.json()) as { session?: SessionState };
          if (body.session) {
            currentSession = body.session;
            break;
          }
        } catch {
        }
      }
    }

    if (currentSession?.kind === "remote") {
      try {
        const response = await fetch("/api/champion", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamName: selectedTeam }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { reason?: string } | null;
          setSaveError(payload?.reason ?? "No pudimos guardar tu campeón. Probá de nuevo.");
          setIsSaving(false);
          return;
        }

        router.push("/");
        router.refresh();
      } catch {
        setSaveError("Falla de red al guardar. Revisá tu conexión y probá de nuevo.");
        setIsSaving(false);
      }
      return;
    }

    if (localScope) {
      saveStoredChampionPick(localScope, {
        teamName: selectedTeam,
        savedAt: new Date().toISOString(),
      });
      router.push("/");
      return;
    }

    setPendingChampionPick({
      teamName: selectedTeam,
      savedAt: new Date().toISOString(),
    });
    router.push("/login?next=/champion");
  }

  const isUnauthenticated = session !== null && session.kind !== "remote" && !localScope;

  if (mode === "summary") {
    return (
      <section className="surface-card-soft panel-stack" style={{ background: "rgba(255,255,255,0.035)", minHeight: 157, gap: 10 }}>
        <div className="title-stack" style={{ gap: 6 }}>
          <p className="eyebrow">Campeón</p>
          <h2 className="section-title" style={{ fontSize: "clamp(1.3rem, 5.4vw, 1.6rem)" }}>
            {selectedOption ? `${selectedOption.flag} ${selectedOption.name}` : "Sin elegir"}
          </h2>
          <p className="muted-copy">{locked ? "Ya quedó cerrado." : "Podés cambiarlo hasta que arranque el Mundial."}</p>
        </div>

        {!locked ? (
          <Link
            className="button-secondary"
            href="/champion"
            style={{
              justifySelf: "stretch",
              width: "100%",
              minHeight: 52,
              height: 52,
              paddingInline: 16,
            }}
          >
            {selectedTeam ? "Editar campeón" : "Elegir campeón"}
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="section-stack" style={{ gap: 14 }}>
      <div className="title-stack">
        <p className="eyebrow">Campeón</p>
        <h1 className="display-title">Elegí campeón</h1>
        <p className="muted-copy">{locked ? "Ya no se puede cambiar." : "Mercado largo del torneo. Elegí uno antes del arranque."}</p>
      </div>

      <section
        className="surface-card-soft"
        style={{
          padding: 14,
          display: "grid",
          gap: 6,
          background: "rgba(255,255,255,0.035)",
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
                    minHeight: 64,
                    borderRadius: 12,
                    border: selected ? "1px solid rgba(216,255,86,0.34)" : "1px solid rgba(255,255,255,0.08)",
                    background: selected ? "linear-gradient(180deg, rgba(216,255,86,0.12) 0%, rgba(255,255,255,0.03) 100%)" : "rgba(255,255,255,0.03)",
                    justifyContent: "space-between",
                    paddingInline: 12,
                    gap: 10,
                    boxShadow: selected ? "0 0 0 1px rgba(216,255,86,0.06), 0 10px 20px rgba(0,0,0,0.18)" : "none",
                    transform: selected ? "translateY(-1px)" : "none",
                    transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.3rem" }}>{team.flag}</span>
                    <span style={{ color: selected ? "var(--gold)" : "#EDE8D9", fontWeight: selected ? 700 : 600 }}>{team.name}</span>
                  </span>
                  <span
                    className="micro-copy"
                    style={{
                      color: selected ? "var(--gold)" : "var(--text-tertiary)",
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

      {!locked && selectedOption ? <div aria-hidden="true" style={{ height: 88 }} /> : null}

      {!locked && selectedOption ? (
        <section
          className="surface-card-soft"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: "calc(var(--bottom-nav-height) + var(--safe-bottom) + 12px)",
            padding: 14,
            display: "grid",
            gap: 10,
            background: "linear-gradient(180deg, rgba(16,22,30,0.98) 0%, rgba(10,14,20,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 26px rgba(0,0,0,0.24)",
            backdropFilter: "blur(10px)",
            zIndex: 50,
          }}
        >
          <div className="split-row" style={{ alignItems: "center" }}>
            <div className="title-stack">
              <span className="eyebrow">Listo para guardar</span>
              <strong style={{ fontSize: "1rem", color: "#EDE8D9" }}>
                {selectedOption.flag} {selectedOption.name}
              </strong>
            </div>
          </div>

          {saveError ? <p className="error-copy">{saveError}</p> : null}

          <button
            className="button-primary"
            disabled={isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? "Guardando..." : isUnauthenticated ? "Iniciar sesión para guardar" : "Guardar campeón"}
          </button>
        </section>
      ) : null}
    </section>
  );
}
