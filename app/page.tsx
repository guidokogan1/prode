import { HomePageClient } from "@/components/home-page-client";
import { TournamentFinaleHero } from "@/components/tournament-finale-hero";
import { WinnerCelebrationOverlay } from "@/components/winner-celebration-overlay";
import { isChampionPickLocked } from "@/lib/champion";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";
import { getProfile } from "@/lib/repositories/profile";
import { getRanking } from "@/lib/repositories/ranking";
import { getTournamentFinalState } from "@/lib/repositories/tournament";

const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

function toArtDateString(iso: string): string {
  return new Date(new Date(iso).getTime() + ART_OFFSET_MS).toISOString().slice(0, 10);
}

export default async function HomePage() {
  const [summary, featuredMatches, profile, tournamentState] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getProfile(),
    getTournamentFinalState(),
  ]);

  if (tournamentState.finished) {
    const ranking = await getRanking();
    const currentUser = ranking.find((entry) => entry.name === profile.name) ?? null;
    const userIsLeader = currentUser?.position === 1;
    return (
      <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
        {userIsLeader && tournamentState.winnerTeam && currentUser ? (
          <WinnerCelebrationOverlay
            userName={profile.name}
            netAmount={currentUser.netAmount}
            winnerTeamName={tournamentState.winnerTeam.name}
            winnerTeamFlag={tournamentState.winnerTeam.flag}
            storageKey={`prode-winner-celebrated:${tournamentState.settledAt ?? "default"}`}
          />
        ) : null}
        <TournamentFinaleHero
          tournament={tournamentState}
          ranking={ranking.slice(0, 5)}
          currentUserName={profile.name}
          currentUserChampionPick={profile.championPick}
        />
      </main>
    );
  }

  const todayArt = toArtDateString(new Date().toISOString());
  const todayMatches = featuredMatches
    .filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) === todayArt)
    .sort((left, right) => (left.kickoffAt ?? "").localeCompare(right.kickoffAt ?? ""));

  const futureMatches = featuredMatches
    .filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) > todayArt)
    .sort((left, right) => (left.kickoffAt ?? "").localeCompare(right.kickoffAt ?? ""));

  const nextDay = futureMatches[0]?.kickoffAt ? toArtDateString(futureMatches[0].kickoffAt) : null;
  const nextDayMatches = nextDay
    ? futureMatches.filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) === nextDay)
    : [];
  const nextDayLabel = nextDay
    ? new Date(nextDay + "T12:00:00Z").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
    : null;

  const needsChampionPick = !isChampionPickLocked() && (!profile.championPick || profile.championPick === "Sin elegir");

  return (
    <main
      className="page-shell"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 16,
        overflow: "hidden",
        minHeight: "calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom))",
      }}
    >
      <HomePageClient
        initialSummary={summary}
        featuredMatches={featuredMatches}
        todayMatches={todayMatches}
        nextDayMatches={nextDayMatches}
        nextDayLabel={nextDayLabel}
        needsChampionPick={needsChampionPick}
      />
    </main>
  );
}
