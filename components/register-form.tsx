"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
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

    if (pin !== confirmPin) {
      setError("Los dos PIN tienen que coincidir.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/session/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmedName,
          pin,
          confirmPin,
        }),
      });

      if (response.ok) {
        router.push("/profile");
        router.refresh();
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;

      if (response.status === 409) {
        setError("Ese nombre ya existe. Probá otro o iniciá sesión.");
        return;
      }

      if (response.status === 503 || payload?.error === "remote auth unavailable") {
        setError("El registro real no está disponible en este entorno.");
        return;
      }

      if (response.status === 500) {
        setError(payload?.detail ? `Error del servidor: ${payload.detail}` : "Error del servidor al crear la cuenta.");
        return;
      }

      setError("No pudimos crear la cuenta ahora. Probá de nuevo.");
    } catch {
      setError("No pudimos crear la cuenta ahora. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="surface-card" style={{ padding: 20, display: "grid", gap: 18 }} onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="registerName">Nombre</label>
        <input
          id="registerName"
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
        <label htmlFor="registerPin">PIN</label>
        <input
          id="registerPin"
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

      <div className="field">
        <label htmlFor="registerPinConfirm">Confirmar PIN</label>
        <input
          id="registerPinConfirm"
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="1234"
          value={confirmPin}
          onChange={(event) => {
            setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
          }}
        />
      </div>

      {error ? <p className="error-copy">{error}</p> : null}

      <button className="button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando..." : "Crear cuenta"}
      </button>

      <Link className="button-secondary" href="/login">
        Ya tengo cuenta
      </Link>
    </form>
  );
}
