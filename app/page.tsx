import { QuickPlayDeck } from "@/components/quick-play-deck";
import { getCurrentSession } from "@/lib/server-session";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";

export default async function HomePage() {
  const [summary, featuredMatches, session] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getCurrentSession(),
  ]);

  const pendingLabel = Number(summary.pendingPicks || "0");
  const initial = session?.displayName?.slice(0, 1).toUpperCase() ?? "V";

  return (
    <main
      className="page-shell"
      style={{
        background: "radial-gradient(ellipse 120% 60% at 50% 0%, #1C3A22 0%, #091409 55%)",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: 14,
      }}
    >
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>⚽</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              letterSpacing: ".14em",
              textTransform: "uppercase",
            }}
          >
            Mundial 26
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pendingLabel > 0 ? <span className="status-pill status-pill-gold">{pendingLabel} sin jugar</span> : null}
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "#1C2E1F",
              color: "#EDE8D9",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1rem",
            }}
          >
            {initial}
          </span>
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <p className="eyebrow">Jugada rápida</p>
            <h1 className="display-title">¿Qué sale?</h1>
            <p className="muted-copy">Elegí de una y seguí con la próxima ronda.</p>
          </div>
          <div style={{ display: "grid", gap: 8, minWidth: 88 }}>
            <div className="surface-card-soft" style={{ padding: "10px 12px", borderRadius: 16 }}>
              <strong style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>{summary.liveMatches}</strong>
              <span className="micro-copy">live</span>
            </div>
            <div className="surface-card-soft" style={{ padding: "10px 12px", borderRadius: 16 }}>
              <strong style={{ display: "block", fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "#D4A64B" }}>{summary.yourNet}</strong>
              <span className="micro-copy">tu tabla</span>
            </div>
          </div>
        </div>
      </section>

      <QuickPlayDeck matches={featuredMatches} />
    </main>
  );
}
