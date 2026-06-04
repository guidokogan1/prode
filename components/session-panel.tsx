"use client";

import Link from "next/link";
import { useContext } from "react";
import { LogOut } from "lucide-react";
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
  const modeCopy =
    session?.kind === "remote"
      ? null
      : session?.kind === "local"
        ? "Estás viendo un perfil local."
        : session?.kind === "demo"
          ? "Estás usando un perfil demo. Para probar acceso real, iniciá sesión."
          : "Entrá para guardar tus jugadas.";

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div className="stack-sm">
        <p className="eyebrow">Cuenta</p>
        <h2 className="section-title">{sessionName}</h2>
      </div>

      {modeCopy ? <p className="muted-copy">{modeCopy}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto", gap: 10, alignItems: "stretch", minHeight: 52 }}>
        <Link className="button-primary" href="/login" style={{ width: "100%", minHeight: 52, height: 52 }}>
          {session?.kind === "anonymous" || session?.kind === "demo" ? "Iniciar sesión" : "Cambiar cuenta"}
        </Link>
        <Link className="button-secondary" href="/pin" style={{ width: "100%", minHeight: 52, height: 52 }}>
          Cambiar PIN
        </Link>
        {session && (session.kind === "remote" || session.kind === "local") ? (
          <button
            className="button-secondary"
            onClick={() => void handleLogout()}
            style={{ width: 52, minHeight: 52, height: 52, paddingInline: 0, justifyContent: "center" }}
            aria-label="Salir"
            title="Salir"
          >
            <LogOut size={16} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
