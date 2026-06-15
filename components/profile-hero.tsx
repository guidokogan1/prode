import type { ProfileViewModel } from "@/lib/domain";
import { formatGross } from "@/lib/format";
import { RulesHelpButton } from "@/components/rules-sheet";

type ProfileHeroProps = {
  profile: ProfileViewModel;
  rankingPosition?: number | null;
  isOverallWinner?: boolean;
};

export function ProfileHero({ profile, rankingPosition = null, isOverallWinner = false }: ProfileHeroProps) {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingTop: 8 }}>
        <div className="title-stack" style={{ gap: 6 }}>
          {isOverallWinner ? (
            <p className="eyebrow" style={{ color: "var(--gold)" }}>🏆 Campeón del prode</p>
          ) : null}
          <h1 className="display-title" style={{ color: isOverallWinner ? "var(--gold)" : undefined }}>
            {profile.name}
          </h1>
          <p className="muted-copy">
            {rankingPosition != null ? `Estás #${rankingPosition} · ` : ""}Tu resumen
          </p>
        </div>
        <RulesHelpButton />
      </div>

      <div className="compact-grid-2">
        {[
          { label: "Aciertos", value: String(profile.positiveTickets), icon: "🎯" },
          { label: "Mayor cobrado", value: formatGross(profile.bestHitGrossAmount), icon: "🔥" },
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
