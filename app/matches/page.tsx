import Link from "next/link";
import { GitFork } from "lucide-react";
import { isDummyMatchId } from "@/lib/dummy-matches";
import { MatchCard } from "@/components/match-card";
import { getMatchActionPriority } from "@/lib/match-ui";
import { getHomeSummary } from "@/lib/repositories/home";
import { listMatches } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const [matches, summary] = await Promise.all([listMatches(), getHomeSummary()]);
  const groups = buildCompetitionGroups(matches);

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 22 }}>
      <section style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        <div className="split-row" style={{ alignItems: "start", gap: 12 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <p className="eyebrow">Fixture board</p>
            <h1 className="display-title">Partidos</h1>
            <p className="muted-copy">Seguí cada cruce.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 4 }}>
            <span className="status-pill status-pill-live" style={{ whiteSpace: "nowrap", minWidth: 88, justifyContent: "center" }}>
              {summary.liveMatches} live
            </span>
            <Link href="/cruces" className="matches-cruces-btn" aria-label="Posiciones y cruces">
              <GitFork size={19} strokeWidth={2} style={{ transform: "rotate(90deg)" }} />
            </Link>
          </div>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.id} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <h2 className="section-title">{group.title}</h2>
              <span className="micro-copy">Bloque de partidos</span>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span className="pill">{group.pendingCount > 0 ? `${group.pendingCount} por jugar` : `${group.matches.length} matches`}</span>
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
    .sort((left, right) => {
      if (left === "Grupo X") return -1;
      if (right === "Grupo X") return 1;
      return String(left).localeCompare(String(right));
    })
    .map((groupLabel) => ({
      id: String(groupLabel),
      title: String(groupLabel),
      matches: groupStageMatches.filter((match) => match.groupLabel === groupLabel),
    }));

  const knockoutOrder = [
    "Dieciseisavos",
    "Octavos de final",
    "Cuartos de final",
    "Semifinales",
    "Tercer puesto",
    "Final",
  ];

  const knockoutGroups = knockoutOrder
    .map((stage) => ({
      id: stage,
      title: stage,
      matches: knockoutMatches.filter((match) => match.stage === stage),
    }))
    .filter((group) => group.matches.length > 0);

  return [...groupStageGroups, ...knockoutGroups].map((group) => ({
    ...group,
    pendingCount: group.matches.filter((match) => getMatchActionPriority(match) === 0).length,
    matches: group.matches
      .slice()
      .sort((left, right) => {
        if (isDummyMatchId(left.id) !== isDummyMatchId(right.id)) {
          return isDummyMatchId(left.id) ? -1 : 1;
        }

        return 0;
      }),
  }));
}
