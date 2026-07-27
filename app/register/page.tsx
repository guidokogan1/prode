import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 20 }}>
      <section className="surface-card" style={{ padding: 18, display: "grid", gap: 16 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Acceso</p>
            <h1 className="display-title">Alta</h1>
          </div>
          <span className="pill">New entry</span>
        </div>

        <p className="muted-copy">Creá tu usuario y dejá listo el acceso para seguir el fixture desde el primer día.</p>

        <div className="two-col-grid">
          <div className="surface-card-soft soft-panel-md" style={{ background: "rgba(63,227,242,0.06)", borderColor: "rgba(63,227,242,0.18)" }}>
            <div className="title-stack">
              <span className="micro-copy">Setup</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Cuenta nueva</strong>
            </div>
          </div>
          <div className="surface-card-soft soft-panel-md">
            <div className="title-stack">
              <span className="micro-copy">Requisito</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>PIN de 4</strong>
            </div>
          </div>
        </div>
      </section>
      <RegisterForm />
    </main>
  );
}
