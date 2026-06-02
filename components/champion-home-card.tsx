import Link from "next/link";

export function ChampionHomeCard() {
  return (
    <section
      className="surface-card"
      style={{
        minHeight: 248,
        padding: 22,
        display: "grid",
        alignContent: "space-between",
        gap: 18,
        background: "linear-gradient(160deg, #24452c 0%, #102018 100%)",
      }}
    >
      <div className="section-stack" style={{ gap: 14 }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <span className="status-pill status-pill-gold" style={{ minHeight: 28, paddingInline: 10 }}>Pendiente</span>
          <span className="micro-copy">Se cierra al inicio</span>
        </div>

        <div className="title-stack">
          <p className="eyebrow">Campeón</p>
          <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.8rem)" }}>
            Elegí quién lo gana
          </h2>
          <p className="muted-copy">Lo hacés una vez y queda fijo.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="split-row">
          <span className="micro-copy">Apuesta larga</span>
          <span className="micro-copy">Antes del 11 Jun</span>
        </div>
        <Link className="button-primary" href="/champion">
          Elegir campeón
        </Link>
      </div>
    </section>
  );
}
