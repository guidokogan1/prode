import { ChampionFinaleCard } from "@/components/champion-finale-card";
import { ChampionPickCard } from "@/components/champion-pick-card";
import { ProfileHero } from "@/components/profile-hero";
import { SessionPanel } from "@/components/session-panel";
import { isChampionPickLocked } from "@/lib/champion";
import { listMatches } from "@/lib/repositories/matches";
import { getProfile } from "@/lib/repositories/profile";
import { getRanking } from "@/lib/repositories/ranking";
import { getTournamentFinalState } from "@/lib/repositories/tournament";

export default async function ProfilePage() {
  const [profile, matches, tournament, ranking] = await Promise.all([
    getProfile(),
    listMatches(),
    getTournamentFinalState(),
    getRanking(),
  ]);
  const currentRanking = ranking.find((item) => item.isCurrentUser) ?? null;
  const teams = Array.from(
    new Map(
      matches
        .flatMap((match) => [
          { name: match.home.name, flag: match.home.flag },
          { name: match.away.name, flag: match.away.flag },
        ])
        .map((team) => [team.name, team]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name));

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <ProfileHero
        profile={profile}
        rankingPosition={currentRanking?.position ?? null}
        isOverallWinner={tournament.finished && currentRanking?.position === 1}
      />

      {tournament.finished ? (
        <ChampionFinaleCard
          tournament={tournament}
          userPick={profile.championPick === "Sin elegir" ? null : profile.championPick}
        />
      ) : (
        <ChampionPickCard
          initialPick={profile.championPick === "Sin elegir" ? null : profile.championPick}
          teams={teams}
          locked={isChampionPickLocked()}
          mode="summary"
        />
      )}

      <SessionPanel />
    </main>
  );
}
