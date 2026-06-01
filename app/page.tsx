import Link from "next/link";
import { QuickPlayDeck } from "@/components/quick-play-deck";
import { formatNetAmount } from "@/lib/format";
import { getMatchStateLabel, getPickStateLabel } from "@/lib/match-ui";
import { getProductProvider } from "@/lib/product";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";

export default async function HomePage() {
  const provider = await getProductProvider();
  const [summary, featuredMatches, session] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    provider.getSessionState(),
  ]);

  const pendingLabel = summary.pendingPicks;
  const initial = session.displayName?.slice(0, 1).toUpperCase() ?? "V";
  const nextMatch = featuredMatches.find((match) => match.isEditable && getPickStateLabel(match) === "Sin jugar") ?? featuredMatches[0] ?? null;
  const headline = pendingLabel > 0 ? `${pendingLabel} por jugar` : "Todo al día";

  return (
    <main
      className="page-shell"
      style={{
        background: "radial-gradient(ellipse 120% 60% at 50% 0%, #1C3A22 0%, #091409 55%)",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: 10,
        overflow: "hidden",
        minHeight: "calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom))",
      }}
    >
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.05rem" }}>⚽</span>
          <span
            style={{
              fontFamily: "var(--font-barlow), system-ui, sans-serif",
              fontWeight: 800,
              fontStyle: "normal",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              fontSize: ".96rem",
            }}
          >
            Mundial 26
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pendingLabel > 0 ? <span className="status-pill status-pill-gold" style={{ minHeight: 28, paddingInline: 10 }}>{pendingLabel} sin jugar</span> : null}
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "#1C2E1F",
              color: "#EDE8D9",
              fontFamily: "var(--font-accent)",
              fontWeight: 800,
              fontSize: ".95rem",
            }}
          >
            {initial}
          </span>
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <p className="eyebrow">Inicio</p>
            <h1 className="display-title">{headline}</h1>
            {nextMatch ? <p className="muted-copy">{nextMatch.home.name} vs {nextMatch.away.name}</p> : null}
          </div>
          {nextMatch ? (
            <Link
              href={`/matches/${nextMatch.id}`}
              className="surface-card-soft"
              style={{ padding: "14px 16px", borderRadius: 18, display: "grid", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span className="pill">{getPickStateLabel(nextMatch)}</span>
                <span className="micro-copy">{getMatchStateLabel(nextMatch)}</span>
              </div>
              <strong style={{ fontSize: "1rem", letterSpacing: "-0.02em" }}>
                {nextMatch.home.flag} {nextMatch.home.name} vs {nextMatch.away.flag} {nextMatch.away.name}
              </strong>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span className="micro-copy">{nextMatch.kickoffLabel}</span>
                <span className="micro-copy">{nextMatch.stage}</span>
              </div>
            </Link>
          ) : null}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="surface-card-soft" style={{ padding: "8px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <strong style={{ display: "block", fontFamily: "var(--font-accent)", fontSize: "1rem", letterSpacing: "-0.04em" }}>{summary.liveMatches}</strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>En vivo</span>
            </div>
            <div className="surface-card-soft" style={{ padding: "8px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <strong style={{ display: "block", fontFamily: "var(--font-accent)", fontSize: "1rem", color: "#D8B56A", letterSpacing: "-0.04em" }}>{formatNetAmount(summary.yourNetAmount)}</strong>
              <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>Tabla</span>
            </div>
          </div>
        </div>
      </section>

      <QuickPlayDeck matches={featuredMatches} />
    </main>
  );
}
