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
      setError("El PIN tiene que ser de 4 digitos.");
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
        saveStoredSession({
          displayName: trimmedName,
          pin,
          joinedAt: new Date().toISOString(),
        });
        router.push("/profile");
        router.refresh();
        return;
      }

      if (response.status !== 503) {
        setError("Nombre o PIN invalidos.");
        return;
      }
    } catch {
      // Falls back to local mode below.
    }

    saveStoredSession({
      displayName: trimmedName,
      pin,
      joinedAt: new Date().toISOString(),
    });
    router.push("/profile");
    router.refresh();
  }

  return (
    <form className="card card-grid" onSubmit={handleSubmit}>
      <div className="pill-row">
        <span className="pill">Sin mail</span>
        <span className="pill">PIN de 4 digitos</span>
        <span className="pill">Acceso inmediato</span>
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

      <p className="body-copy">
        Si hay backend, entra por cookie remota. Si no, sigue en modo local sin romper el flujo.
      </p>

      {error ? <p className="error-copy">{error}</p> : null}

      <button className="primary-button" type="submit">
        Entrar al juego
      </button>
    </form>
  );
}
