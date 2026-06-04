import Link from "next/link";
import { ChampionPickCard } from "@/components/champion-pick-card";
import { isChampionPickLocked } from "@/lib/champion";
import { shouldIncludeMatchInChampionPool } from "@/lib/dummy-matches";
import { listMatches } from "@/lib/repositories/matches";
import { getProfile } from "@/lib/repositories/profile";

export default async function ChampionPage() {
  const [profile, matches] = await Promise.all([getProfile(), listMatches()]);

  const teams = Array.from(
    new Map(
      matches
        .filter((match) => match.groupLabel && shouldIncludeMatchInChampionPool(match.id))
        .flatMap((match) => [
          { name: match.home.name, flag: match.home.flag, groupLabel: match.groupLabel },
          { name: match.away.name, flag: match.away.flag, groupLabel: match.groupLabel },
        ])
        .map((team) => [team.name, team]),
    ).values(),
  );

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link className="button-secondary" href="/" style={{ minHeight: 38 }}>
          Volver
        </Link>
      </div>

      <ChampionPickCard
        initialPick={profile.championPick === "Sin elegir" ? null : profile.championPick}
        teams={teams}
        locked={isChampionPickLocked()}
        mode="checklist"
      />
    </main>
  );
}
