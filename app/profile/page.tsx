import { DemoSwitcher } from "@/components/demo-switcher";
import Link from "next/link";
import { SessionPanel } from "@/components/session-panel";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getDemoPersonas } from "@/lib/mock-data";
import { getProfile } from "@/lib/repositories/profile";

export default async function ProfilePage() {
  const [profile, activePersona] = await Promise.all([getProfile(), getActiveDemoPersonaSlug()]);

  return (
    <main className="stack page-narrow">
      <section className="card profile-hero">
        <p className="eyebrow">Perfil</p>
        <h1 className="page-title">{profile.name}</h1>
        <div className="quick-stats">
          <div className="quick-stat">
            <strong>{profile.netLabel}</strong>
            <span>neto</span>
          </div>
          <div className="quick-stat">
            <strong>{profile.positiveTickets}</strong>
            <span>positivas</span>
          </div>
          <div className="quick-stat">
            <strong>{profile.bestHit}</strong>
            <span>mejor</span>
          </div>
        </div>
      </section>

      <SessionPanel />

      <DemoSwitcher activePersona={activePersona} personas={getDemoPersonas()} />

      <section className="card compact-summary">
        <strong>Campeón: {profile.championPick}</strong>
        <span className="subtle">Se liquida al final del torneo.</span>
      </section>

      <section className="card card-grid">
        <div className="section-title section-title-compact">
          <div>
            <p className="eyebrow">Cuenta</p>
            <h2>Entrar rápido</h2>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-cell">
            <strong>PIN corto</strong>
            <span>Sin mail ni password</span>
          </div>
          <div className="stat-cell">
            <strong>Historial</strong>
            <span>Todo queda guardado</span>
          </div>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/history">
            Ver jugadas
          </Link>
          <Link className="pill" href="/login">
            Cambiar acceso
          </Link>
        </div>
      </section>
    </main>
  );
}
