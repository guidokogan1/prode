"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-feedback";

export function PinForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = displayName.trim();

    if (trimmedName.length < 2) {
      setError("Ingresá tu nombre.");
      return;
    }

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(nextPin)) {
      setError("El PIN tiene que tener 4 dígitos.");
      return;
    }

    if (nextPin !== confirmPin) {
      setError("Los dos PIN nuevos tienen que coincidir.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/session/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmedName,
          currentPin,
          nextPin,
          confirmPin,
        }),
      });

      if (response.ok) {
        setSuccess("PIN actualizado.");
        router.refresh();
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;

      setError(getAuthErrorMessage("pin", response.status, payload));
    } catch {
      setError("No pudimos cambiar el PIN ahora. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="surface-card" style={{ padding: 20, display: "grid", gap: 18 }} onSubmit={handleSubmit}>
      <div className="split-row" style={{ alignItems: "start" }}>
        <div className="title-stack">
          <p className="eyebrow">Seguridad</p>
          <h2 className="section-title">Actualizar PIN</h2>
        </div>
        <span className="pill">Secure update</span>
      </div>

      <div className="field">
        <label htmlFor="pinName">Nombre</label>
        <input
          id="pinName"
          className="text-input"
          placeholder="Guido"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setError(null);
            setSuccess(null);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="currentPin">PIN actual</label>
        <input
          id="currentPin"
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="1234"
          value={currentPin}
          onChange={(event) => {
            setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
            setSuccess(null);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="nextPin">PIN nuevo</label>
        <input
          id="nextPin"
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="1234"
          value={nextPin}
          onChange={(event) => {
            setNextPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
            setSuccess(null);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="confirmNextPin">Confirmar PIN nuevo</label>
        <input
          id="confirmNextPin"
          className="text-input"
          type="password"
          inputMode="numeric"
          placeholder="1234"
          value={confirmPin}
          onChange={(event) => {
            setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
            setSuccess(null);
          }}
        />
      </div>

      {error ? <p className="error-copy">{error}</p> : null}
      {success ? <p className="micro-copy" style={{ color: "var(--gold)" }}>{success}</p> : <p className="micro-copy">Usá siempre un PIN de 4 dígitos. Si entra bien, el cambio queda aplicado al instante.</p>}

      <button className="button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Cambiar PIN"}
      </button>

      <Link className="button-secondary" href="/login">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
