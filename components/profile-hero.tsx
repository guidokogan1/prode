import type { ProfileViewModel } from "@/lib/domain";

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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(212,166,75,0.18)",
              border: "2px solid rgba(212,166,75,0.4)",
              color: "#D4A64B",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.8rem",
            }}
          >
            {profile.name.slice(0, 1)}
          </span>
          <div style={{ display: "grid", gap: 4 }}>
            <p className="eyebrow">Yo</p>
            <h1 className="display-title">{profile.name}</h1>
            <p className="muted-copy">Tu partido, tu tabla y tus jugadas fuertes.</p>
          </div>
        </div>

        <div
          className="surface-card-soft"
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(212,166,75,0.08)",
            borderColor: "rgba(212,166,75,0.2)",
            textAlign: "right",
            minWidth: 132,
            marginLeft: "auto",
          }}
        >
          <strong style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "2rem", color: "#D4A64B" }}>
            {profile.netLabel}
          </strong>
          <span className="micro-copy">tu tabla</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 12 }}>
        {[
          { label: "Positivas", value: String(profile.positiveTickets), icon: "🎯" },
          { label: "Mejor golpe", value: profile.bestHit, icon: "🔥" },
          { label: "Campeón", value: profile.championPick, icon: "🏆" },
        ].map((item) => (
          <div key={item.label} className="surface-card-soft" style={{ padding: "14px 12px", borderRadius: 16, textAlign: "center" }}>
            <div style={{ display: "grid", gap: 5 }}>
              <span>{item.icon}</span>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{item.value}</strong>
              <span className="micro-copy">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
