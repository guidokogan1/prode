"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-feedback";

function resolveNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveNextPath(searchParams.get("next"));
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
        router.push(nextPath);
        router.refresh();
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;

      setError(getAuthErrorMessage("register", response.status, payload));
    } catch {
      setError("No pudimos crear la cuenta ahora. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="surface-card" style={{ padding: 20, display: "grid", gap: 18 }} onSubmit={handleSubmit}>
      <div className="split-row" style={{ alignItems: "start" }}>
        <div className="title-stack">
          <p className="eyebrow">Registro</p>
          <h2 className="section-title">Crear usuario</h2>
        </div>
        <span className="pill">4-digit PIN</span>
      </div>

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

      {error ? <p className="error-copy">{error}</p> : <p className="micro-copy">Elegí un nombre claro para aparecer en la tabla y un PIN simple de recordar.</p>}

      <button className="button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando..." : "Crear cuenta"}
      </button>

      <Link className="button-secondary" href={nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`}>
        Ya tengo cuenta
      </Link>
    </form>
  );
}
