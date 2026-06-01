import type { ProfileViewModel } from "@/lib/domain";
import { formatNetAmount } from "@/lib/format";

type ProfileHeroProps = {
  profile: ProfileViewModel;
};

export function ProfileHero({ profile }: ProfileHeroProps) {
  return (
    <section
      className="surface-card-strong"
      style={{
        padding: 22,
        background: "radial-gradient(ellipse 140% 80% at 50% 0%, #1C3522 0%, #091409 70%)",
      }}
    >
      <div className="split-row-start" style={{ marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <span className="hero-avatar">{profile.name.slice(0, 1)}</span>
          <div className="title-stack">
            <p className="eyebrow">Perfil</p>
            <h1 className="display-title">{profile.name}</h1>
            <p className="muted-copy">Tu resumen</p>
          </div>
        </div>

        <div
          className="surface-card-soft text-right"
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(212,166,75,0.08)",
            borderColor: "rgba(212,166,75,0.2)",
            minWidth: 132,
            marginLeft: "auto",
          }}
        >
          <strong style={{ display: "block", fontFamily: "var(--font-accent)", fontSize: "2rem", color: "#D8B56A", letterSpacing: "-0.05em" }}>
            {formatNetAmount(profile.netAmount)}
          </strong>
          <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>Neto</span>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: "Positivas", value: String(profile.positiveTickets), icon: "🎯" },
          { label: "Mejor", value: formatNetAmount(profile.bestHitAmount), icon: "🔥" },
          { label: "Campeón", value: profile.championPick ?? "Sin elegir", icon: "🏆" },
        ].map((item) => (
          <div key={item.label} className="surface-card-soft soft-panel-md" style={{ textAlign: "center" }}>
            <div style={{ display: "grid", gap: 5 }}>
              <span>{item.icon}</span>
              <strong style={{ fontFamily: item.label === "Campeón" ? "var(--font-display)" : "var(--font-accent)", fontSize: "1.15rem", letterSpacing: item.label === "Campeón" ? "-0.02em" : "-0.04em" }}>{item.value}</strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
