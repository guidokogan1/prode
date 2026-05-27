"use client";

import Link from "next/link";
import { clearStoredSession, getStoredSession, SESSION_EVENT } from "@/lib/local-store";
import { useEffect, useState } from "react";

export function SessionPanel() {
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"local" | "remote" | "demo" | null>(null);

  useEffect(() => {
    const sync = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as {
          session: { displayName: string; mode: "local" | "remote" | "demo" } | null;
        };

        if (payload.session) {
          setSessionName(payload.session.displayName);
          setSessionMode(payload.session.mode);
          return;
        }
      } catch {
        // Falls back below.
      }

      const localSession = getStoredSession();
      setSessionName(localSession?.displayName ?? null);
      setSessionMode(localSession ? "local" : "demo");
    };

    void sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // Local cleanup still applies.
    }

    clearStoredSession();
    setSessionName(null);
    setSessionMode("demo");
  }

  const modeCopy =
    sessionMode === "remote"
      ? "Ya estás jugando con sesión remota guardada."
      : sessionMode === "local"
        ? "Estás jugando en este dispositivo."
        : "Estás viendo el juego en modo demo.";

  return (
    <section className="surface-card-soft" style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <p className="eyebrow">Tu acceso</p>
          <h2 className="section-title">{sessionName ?? "Sin entrar"}</h2>
        </div>
        <span className="pill">{sessionMode ? `modo ${sessionMode}` : "sin sesión"}</span>
      </div>

      <p className="muted-copy">{modeCopy}</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="button-primary" href="/login">
          {sessionName ? "Editar acceso" : "Entrar"}
        </Link>
        {sessionName ? (
          <button className="button-secondary" onClick={() => void handleLogout()}>
            Cerrar sesión
          </button>
        ) : null}
      </div>
    </section>
  );
}
