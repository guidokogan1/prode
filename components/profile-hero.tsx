import type { ProfileViewModel } from "@/lib/domain";
import { formatNetAmount } from "@/lib/format";

type ProfileHeroProps = {
  profile: ProfileViewModel;
};

export function ProfileHero({ profile }: ProfileHeroProps) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div className="title-stack" style={{ gap: 6, paddingTop: 8 }}>
        <h1 className="display-title">{profile.name}</h1>
        <p className="muted-copy">Tu resumen</p>
      </div>

      <div className="compact-grid-2">
        {[
          { label: "Aciertos", value: String(profile.positiveTickets), icon: "🎯" },
          { label: "Mayor ganancia", value: formatNetAmount(profile.bestHitAmount), icon: "🔥" },
        ].map((item) => (
          <div
            key={item.label}
            className="surface-card-soft soft-panel-md"
            style={{ textAlign: "center", background: "rgba(255,255,255,0.035)", minHeight: 95, paddingBlock: 10, display: "grid", alignItems: "center" }}
          >
            <div style={{ display: "grid", gap: 3 }}>
              <span>{item.icon}</span>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.15rem", letterSpacing: "-0.04em" }}>{item.value}</strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
