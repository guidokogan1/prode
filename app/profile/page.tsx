import { DemoSwitcher } from "@/components/demo-switcher";
import Link from "next/link";
import { SessionPanel } from "@/components/session-panel";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getDemoPersonas } from "@/lib/mock-data";
import { getProfile } from "@/lib/repositories/profile";

export default async function ProfilePage() {
  const [profile, activePersona] = await Promise.all([getProfile(), getActiveDemoPersonaSlug()]);

  return (
    <main className="stack page-mid">
      <section className="card hero-card">
        <div className="stack">
          <span className="eyebrow">Perfil</span>
          <h1 className="page-title">{profile.name}</h1>
          <p className="body-copy">
            Nombre + PIN alcanza para jugar entre amigos, entrar rapido y no meter una capa de
            acceso innecesaria.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{profile.netLabel}</strong>
            <span>Ganancia acumulada</span>
          </div>
          <div className="hero-stat">
            <strong>{profile.positiveTickets}</strong>
            <span>Jugadas positivas</span>
          </div>
          <div className="hero-stat">
            <strong>{profile.bestHit}</strong>
            <span>Mejor acierto</span>
          </div>
        </div>
      </section>

      <SessionPanel />

      <DemoSwitcher activePersona={activePersona} personas={getDemoPersonas()} />

      <section className="card card-grid">
        <div className="section-title">
          <div>
            <p className="eyebrow">Campeon</p>
            <h2>Tu pick campeon</h2>
          </div>
          <span className="pill">Pozo separado</span>
        </div>
        <p className="body-copy">
          {profile.championPick} es tu jugada larga. Se liquida solo al final del torneo.
        </p>
      </section>

      <section className="card card-grid">
        <div className="section-title">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2>Acceso simple</h2>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-cell">
            <strong>PIN corto</strong>
            <span>Rapido para entrar desde el celu</span>
          </div>
          <div className="stat-cell">
            <strong>Sesion local</strong>
            <span>Persistida sin pedir mail ni password</span>
          </div>
        </div>
        <Link className="pill" href="/login">
          Cambiar nombre o PIN
        </Link>
      </section>
    </main>
  );
}
