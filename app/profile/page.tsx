import Link from "next/link";
import { DemoSwitcher } from "@/components/demo-switcher";
import { ProfileHero } from "@/components/profile-hero";
import { SessionPanel } from "@/components/session-panel";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getDemoPersonas } from "@/lib/mock-data";
import { getProfile } from "@/lib/repositories/profile";

export default async function ProfilePage() {
  const [profile, activePersona] = await Promise.all([getProfile(), getActiveDemoPersonaSlug()]);

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <ProfileHero profile={profile} />

      <SessionPanel />

      <DemoSwitcher activePersona={activePersona} personas={getDemoPersonas()} />

      <section className="surface-card-soft" style={{ padding: 18, display: "grid", gap: 14 }}>
        <div>
          <p className="eyebrow">Tu cuenta</p>
          <h2 className="section-title">Entrás fácil</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div className="surface-card-soft" style={{ padding: 14, borderRadius: 16 }}>
            <strong>PIN corto</strong>
            <p className="muted-copy">Sin mail, sin vueltas, directo al juego.</p>
          </div>
          <div className="surface-card-soft" style={{ padding: 14, borderRadius: 16 }}>
            <strong>Historial</strong>
            <p className="muted-copy">Tus rondas quedan guardadas y se leen rápido.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button-primary" href="/history">
            Ver jugadas
          </Link>
          <Link className="button-secondary" href="/login">
            Cambiar acceso
          </Link>
        </div>
      </section>
    </main>
  );
}
