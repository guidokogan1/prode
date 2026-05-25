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
          session: { displayName: string; mode: "local" | "remote" } | null;
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
      setSessionMode(localSession ? "local" : null);
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
    setSessionMode(null);
  }

  return (
    <section className="card card-grid">
      <div className="section-title">
        <div>
          <p className="eyebrow">Tu acceso</p>
          <h2>{sessionName ? sessionName : "Todavia no entraste"}</h2>
        </div>
        <span className="pill">
          {sessionName
            ? `Modo ${
                sessionMode === "remote" ? "remoto" : sessionMode === "demo" ? "demo" : "local"
              }`
            : "Falta entrar"}
        </span>
      </div>

      <p className="body-copy">
        {sessionMode === "remote"
          ? "Tu sesion ya esta respaldada por backend y puede pasar a datos reales sin cambiar la experiencia."
          : sessionMode === "demo"
            ? "Estas viendo el producto con un perfil dummy consistente, ideal para revisar estados, pantallas y distintos recorridos."
          : "Mientras no haya backend real, el juego puede seguir funcionando en este dispositivo sin perder el ritmo."}
      </p>

      <div className="action-row">
        <Link className="primary-button button-link" href="/login">
          {sessionName ? "Editar acceso" : "Crear acceso"}
        </Link>
        {sessionName ? (
          <button className="secondary-button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        ) : null}
      </div>
    </section>
  );
}
