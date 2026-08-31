import { HomePageClient } from "@/components/home-page-client";
import { TournamentFinaleHero } from "@/components/tournament-finale-hero";
import { WinnerCelebrationOverlay } from "@/components/winner-celebration-overlay";
import { isChampionPickAllowedFor } from "@/lib/champion";
import { getCurrentSession, requireSession } from "@/lib/server-session";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";
import { getProfile } from "@/lib/repositories/profile";
import { getRanking } from "@/lib/repositories/ranking";
import { getTournamentFinalState } from "@/lib/repositories/tournament";

const ART_OFFSET_MS = -3 * 60 * 60 * 1000;
const NEAR_WINDOW_DAYS = 7;

function toArtDateString(iso: string): string {
  return new Date(new Date(iso).getTime() + ART_OFFSET_MS).toISOString().slice(0, 10);
}

export default async function HomePage() {
  await requireSession();

  const [summary, featuredMatches, profile, tournamentState, session] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getProfile(),
    getTournamentFinalState(),
    getCurrentSession(),
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
            grossAmount={currentUser.grossAmount}
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

  const tomorrowArt = toArtDateString(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  const nextDayMatches = featuredMatches
    .filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) === tomorrowArt)
    .sort((left, right) => (left.kickoffAt ?? "").localeCompare(right.kickoffAt ?? ""));
  const nextDayLabel = new Date(tomorrowArt + "T12:00:00Z").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const needsChampionPick = isChampionPickAllowedFor(session?.displayName) && (!profile.championPick || profile.championPick === "Sin elegir");

  const nearWindowEndArt = toArtDateString(new Date(Date.now() + NEAR_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString());
  const nearPendingMatches = featuredMatches
    .filter((match) => match.userStateLabel === "Te falta jugar")
    .filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) <= nearWindowEndArt)
    .sort((left, right) => (left.kickoffAt ?? "").localeCompare(right.kickoffAt ?? ""));

  return (
    <main
      className="page-shell"
      style={{
        display: "grid",
        gap: 16,
        alignContent: "start",
        overflow: "hidden",
      }}
    >
      <HomePageClient
        initialSummary={summary}
        nearPendingMatches={nearPendingMatches}
        todayMatches={todayMatches}
        nextDayMatches={nextDayMatches}
        nextDayLabel={nextDayLabel}
        needsChampionPick={needsChampionPick}
      />
    </main>
  );
}
