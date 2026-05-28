import { MatchCard } from "@/components/match-card";
import { getHomeSummary } from "@/lib/repositories/home";
import { listMatchesByStage } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const [matchesByStage, summary] = await Promise.all([listMatchesByStage(), getHomeSummary()]);

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 22 }}>
      <section style={{ display: "grid", gap: 8, paddingTop: 8 }}>
        <p className="eyebrow">Modo maratón</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h1 className="display-title">Cargá grupos</h1>
            <p className="muted-copy">Entrá y resolvé varios partidos de corrido sin salir del ritmo.</p>
          </div>
          <span className="status-pill status-pill-gold" style={{ whiteSpace: "nowrap", minWidth: 102, justifyContent: "center", flexShrink: 0 }}>
            {summary.pendingPicks} por jugar
          </span>
        </div>
      </section>

      {matchesByStage.map((group) => (
        <section key={group.stage} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <p className="eyebrow">{group.label}</p>
              <h2 className="section-title">{group.stage}</h2>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            <span className="micro-copy">{group.matches.length} partidos</span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {group.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
