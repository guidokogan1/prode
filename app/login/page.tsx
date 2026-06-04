import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 20 }}>
      <section className="surface-card" style={{ padding: 18, display: "grid", gap: 16 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Acceso</p>
            <h1 className="display-title">Entrar</h1>
          </div>
          <span className="pill">Matchday</span>
        </div>

        <p className="muted-copy">Volvé al pool, revisá tus jugadas y seguí el ritmo del torneo.</p>

        <div className="two-col-grid">
          <div className="surface-card-soft soft-panel-md" style={{ background: "rgba(216,255,86,0.06)", borderColor: "rgba(216,255,86,0.18)" }}>
            <div className="title-stack">
              <span className="micro-copy">Rápido</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Nombre + PIN</strong>
            </div>
          </div>
          <div className="surface-card-soft soft-panel-md">
            <div className="title-stack">
              <span className="micro-copy">Objetivo</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Entrar y jugar</strong>
            </div>
          </div>
        </div>
      </section>
      <LoginForm />
    </main>
  );
}
