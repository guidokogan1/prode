import Link from "next/link";

export function ChampionHomeCard() {
  return (
    <section
      className="surface-card"
      style={{
        minHeight: 332,
        padding: 22,
        display: "grid",
        alignContent: "space-between",
        background: "linear-gradient(160deg, #24452c 0%, #102018 100%)",
      }}
    >
      <div className="title-stack">
        <p className="eyebrow">Antes de arrancar</p>
        <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.8rem)" }}>
          Elegí campeón
        </h2>
        <p className="muted-copy">Lo definís una vez para todo el Mundial.</p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="split-row">
          <span className="micro-copy">Premio largo</span>
          <span className="micro-copy">Cierra al inicio</span>
        </div>
        <Link className="button-primary" href="/champion">
          Elegir ahora
        </Link>
      </div>
    </section>
  );
}
