import { PinForm } from "@/components/pin-form";

export default function PinPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 20 }}>
      <section className="surface-card" style={{ padding: 18, display: "grid", gap: 16 }}>
        <div className="split-row" style={{ alignItems: "start" }}>
          <div className="title-stack">
            <p className="eyebrow">Acceso</p>
            <h1 className="display-title">Reset PIN</h1>
          </div>
          <span className="pill">Security</span>
        </div>

        <p className="muted-copy">Validá tu acceso actual y actualizá el PIN para seguir entrando sin fricción.</p>

        <div className="two-col-grid">
          <div className="surface-card-soft soft-panel-md" style={{ background: "rgba(255,85,71,0.05)", borderColor: "rgba(255,85,71,0.16)" }}>
            <div className="title-stack">
              <span className="micro-copy">Paso 1</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Verificá</strong>
            </div>
          </div>
          <div className="surface-card-soft soft-panel-md">
            <div className="title-stack">
              <span className="micro-copy">Paso 2</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", letterSpacing: "-0.03em", textTransform: "uppercase" }}>Actualizá</strong>
            </div>
          </div>
        </div>
      </section>
      <PinForm />
    </main>
  );
}
