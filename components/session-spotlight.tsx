"use client";

import Link from "next/link";
import { useContext } from "react";
import { SessionContext } from "@/components/session-provider";

export function SessionSpotlight() {
  const session = useContext(SessionContext);

  return (
    <section className="card card-grid">
      <div className="section-title">
        <div>
          <p className="eyebrow">Tu acceso</p>
          <h2>{session ? `Hola, ${session.displayName}` : "Entrar tarda 10 segundos"}</h2>
        </div>
        <span className="pill">
          {session
            ? `Modo ${
                session.kind === "remote" ? "remoto" : session.kind === "demo" ? "demo" : session.kind === "local" ? "local" : "anon"
              }`
            : "Nombre + PIN"}
        </span>
      </div>
      <p className="body-copy">
        {session
          ? session.kind === "demo"
            ? "Estas navegando con un perfil de prueba. Cambialo desde el selector para inspeccionar leaders, perseguidores, contrarians y estados pendientes."
            : "Ya tenes una sesion activa en este dispositivo. Si hay backend, entra por cookie; si no, sigue todo igual en local."
          : "No hace falta mail ni password: con nombre + PIN el grupo entra rapido y se concentra en jugar."}
      </p>
      <Link className="pill" href="/login">
        {session ? "Administrar acceso" : "Entrar ahora"}
      </Link>
    </section>
  );
}
