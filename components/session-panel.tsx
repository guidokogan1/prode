"use client";

import Link from "next/link";
import type { SessionState } from "@/lib/domain";
import { clearStoredSession, getStoredSession, SESSION_EVENT } from "@/lib/local-store";
import { useEffect, useState } from "react";

export function SessionPanel() {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const sync = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as { session: SessionState };

        if (payload.session.kind === "anonymous") {
          const localSession = getStoredSession();
          if (localSession) {
            setSession({
              kind: "local",
              appMode: payload.session.appMode,
              displayName: localSession.displayName,
              demoPersonaSlug: payload.session.demoPersonaSlug,
            });
            return;
          }
        }

        setSession(payload.session);
        return;
      } catch {
        const localSession = getStoredSession();
        setSession(
          localSession
            ? {
                kind: "local",
                appMode: "demo",
                displayName: localSession.displayName,
              }
            : {
                kind: "anonymous",
                appMode: "demo",
                displayName: null,
              },
        );
      }
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
    setSession((current) =>
      current
        ? {
            kind: current.appMode === "demo" ? "demo" : "anonymous",
            appMode: current.appMode,
            displayName: current.appMode === "demo" ? current.displayName : null,
            demoPersonaSlug: current.demoPersonaSlug,
          }
        : {
            kind: "anonymous",
            appMode: "demo",
            displayName: null,
          },
    );
  }

  const sessionName = session?.displayName ?? "Sin entrar";
  const sessionBadge =
    session?.kind === "remote"
      ? "Conectado"
      : session?.kind === "local"
        ? "Local"
        : session?.kind === "demo"
          ? "Demo"
          : "Invitado";
  const modeCopy =
    session?.kind === "remote"
      ? "Tu cuenta real está conectada."
      : session?.kind === "local"
        ? "Estás viendo un perfil local."
        : session?.kind === "demo"
          ? "Estás usando un perfil demo."
          : "Entrá para guardar tus jugadas.";

  return (
    <section className="surface-card-soft panel-stack">
      <div className="panel-head">
        <div className="stack-sm">
          <p className="eyebrow">Sesión</p>
          <h2 className="section-title">{sessionName}</h2>
        </div>
        <span className="pill">{sessionBadge}</span>
      </div>

      <p className="muted-copy">{modeCopy}</p>

      <div className="actions-row">
        <Link className="button-primary" href="/login">
          {session?.kind === "anonymous" || session?.kind === "demo" ? "Iniciar sesión" : "Cambiar acceso"}
        </Link>
        {session && session.kind !== "anonymous" ? (
          <button className="button-secondary" onClick={() => void handleLogout()}>
            Salir
          </button>
        ) : null}
      </div>
    </section>
  );
}
