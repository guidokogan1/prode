"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveStoredSession } from "@/lib/local-store";

export function LoginForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = displayName.trim();

    if (trimmedName.length < 2) {
      setError("El nombre tiene que tener al menos 2 caracteres.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN tiene que ser de 4 dígitos.");
      return;
    }

    try {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmedName,
          pin,
        }),
      });

      if (response.ok) {
        router.push("/profile");
        router.refresh();
        return;
      }

      if (response.status !== 503) {
        setError("Nombre o PIN inválidos.");
        return;
      }
    } catch {
      // Falls back to local mode below.
    }

    saveStoredSession({
      displayName: trimmedName,
      joinedAt: new Date().toISOString(),
      kind: "local",
    });
    router.push("/profile");
    router.refresh();
  }

  return (
    <form className="surface-card" style={{ padding: 20, display: "grid", gap: 16 }} onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill">Sin mail</span>
        <span className="pill">PIN 4 dígitos</span>
        <span className="pill">Entrás y jugás</span>
      </div>

      <div className="field">
        <label htmlFor="displayName">Nombre</label>
        <input
          id="displayName"
          className="text-input"
          placeholder="Guido"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setError(null);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="1234"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
          }}
        />
      </div>

      <p className="muted-copy">Entrás rápido y la app se acuerda de vos en este dispositivo.</p>

      {error ? <p className="error-copy">{error}</p> : null}

      <button className="button-primary" type="submit">
        Entrar al juego
      </button>
    </form>
  );
}
