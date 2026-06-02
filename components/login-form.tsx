"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-feedback";

export function LoginForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = displayName.trim();

    if (trimmedName.length < 2) {
      setError("Ingresá un nombre de al menos 2 caracteres.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN tiene que tener 4 dígitos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

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

      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;

      setError(getAuthErrorMessage("login", response.status, payload));
    } catch {
      setError("No pudimos validar tu cuenta ahora. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="surface-card" style={{ padding: 20, display: "grid", gap: 18 }} onSubmit={handleSubmit}>
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

      {error ? <p className="error-copy">{error}</p> : null}

      <button className="button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <div style={{ display: "grid", gap: 10 }}>
        <Link className="button-secondary" href="/register">
          Crear cuenta
        </Link>
        <Link className="button-ghost" href="/pin" style={{ justifyContent: "center", minHeight: 40 }}>
          Cambiar PIN
        </Link>
      </div>
    </form>
  );
}
