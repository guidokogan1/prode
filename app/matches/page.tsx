import { MatchCard } from "@/components/match-card";
import { getHomeSummary } from "@/lib/repositories/home";
import { getMatchUrgencyBucket, sortMatchesByUrgency, type MatchUrgencyBucket } from "@/lib/match-ui";
import { listMatches } from "@/lib/repositories/matches";

export default async function MatchesPage() {
  const [matches, summary] = await Promise.all([listMatches(), getHomeSummary()]);
  const sortedMatches = matches.slice().sort(sortMatchesByUrgency);
  const groups = buildUrgencyGroups(sortedMatches);

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

function buildUrgencyGroups(matches: Awaited<ReturnType<typeof listMatches>>) {
  const order: { id: MatchUrgencyBucket; title: string }[] = [
    { id: "pending", title: "Por cerrar pronto" },
    { id: "live", title: "En vivo" },
    { id: "upcoming", title: "Más tarde" },
    { id: "settled", title: "Liquidados" },
  ];

  return order
    .map((group) => ({
      ...group,
      matches: matches.filter((match) => getMatchUrgencyBucket(match) === group.id),
    }))
    .filter((group) => group.matches.length > 0);
}
