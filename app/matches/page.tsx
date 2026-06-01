import { MatchCard } from "@/components/match-card";
import { getHomeSummary } from "@/lib/repositories/home";
import { listMatches } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const [matches, summary] = await Promise.all([listMatches(), getHomeSummary()]);
  const groups = buildCompetitionGroups(matches);

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 22 }}>
      <section style={{ display: "grid", gap: 8, paddingTop: 8 }}>
        <p className="eyebrow">Fixture</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h1 className="display-title">{summary.pendingPicks} por jugar</h1>
          </div>
          <span className="status-pill status-pill-gold" style={{ whiteSpace: "nowrap", minWidth: 102, justifyContent: "center", flexShrink: 0 }}>
            {summary.liveMatches} en vivo
          </span>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.id} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <h2 className="section-title">{group.title}</h2>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            <span className="micro-copy">{group.matches.length}</span>
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

function buildCompetitionGroups(matches: Awaited<ReturnType<typeof listMatches>>) {
  const groupStageMatches = matches.filter((match) => match.stage === "Fase de grupos");
  const knockoutMatches = matches.filter((match) => match.stage !== "Fase de grupos");

  const groupStageGroups = [...new Set(groupStageMatches.map((match) => match.groupLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)))
    .map((groupLabel) => ({
      id: String(groupLabel),
      title: String(groupLabel),
      matches: groupStageMatches.filter((match) => match.groupLabel === groupLabel),
    }));

  const knockoutOrder = [
    "Octavos de final",
    "Cuartos de final",
    "Semifinales",
    "Final",
  ];

  const knockoutGroups = knockoutOrder
    .map((stage) => ({
      id: stage,
      title: stage,
      matches: knockoutMatches.filter((match) => match.stage === stage),
    }))
    .filter((group) => group.matches.length > 0);

  return [...groupStageGroups, ...knockoutGroups];
}
