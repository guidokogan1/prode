"use client";

import Link from "next/link";
import { useContext } from "react";
import { SessionContext } from "@/components/session-provider";
import { clearStoredSession } from "@/lib/local-store";

export function SessionPanel() {
  const session = useContext(SessionContext);

  async function handleLogout() {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // Local cleanup still applies.
    }

    clearStoredSession();
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
      ? null
      : session?.kind === "local"
        ? "Estás viendo un perfil local."
        : session?.kind === "demo"
          ? "Estás usando un perfil demo. Para probar acceso real, iniciá sesión."
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

      {modeCopy ? <p className="muted-copy">{modeCopy}</p> : null}

      <div className="actions-row">
        <Link className="button-primary" href="/login">
          {session?.kind === "anonymous" || session?.kind === "demo" ? "Iniciar sesión" : "Cambiar acceso"}
        </Link>
        <Link className="button-secondary" href="/pin">
          Cambiar PIN
        </Link>
        {session && (session.kind === "remote" || session.kind === "local") ? (
          <button className="button-secondary" onClick={() => void handleLogout()}>
            Salir
          </button>
        ) : null}
      </div>
    </section>
  );
}
