"use client";

import Link from "next/link";
import { useContext } from "react";
import { SessionContext } from "@/components/session-provider";

export function SessionSpotlight() {
  const session = useContext(SessionContext);
  const sessionKind =
    session?.kind === "remote" ? "remota" : session?.kind === "demo" ? "demo" : session?.kind === "local" ? "local" : "sin sesión";

  return (
    <section className="surface-card-soft panel-stack">
      <div className="panel-head">
        <div className="stack-sm">
          <p className="eyebrow">Acceso</p>
          <h2 className="section-title">{session ? session.displayName : "Entrar"}</h2>
        </div>
        <span className="pill">{session ? sessionKind : "Nombre + PIN"}</span>
      </div>
      <p className="muted-copy">{session ? "Sesión lista" : "Nombre + PIN"}</p>
      <Link className="button-secondary" href="/login">
        {session ? "Cambiar acceso" : "Entrar"}
      </Link>
    </section>
  );
}
