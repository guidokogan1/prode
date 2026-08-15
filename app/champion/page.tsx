import { redirect } from "next/navigation";
import Link from "next/link";
import { ChampionPickCard } from "@/components/champion-pick-card";
import { isChampionPickAllowedFor } from "@/lib/champion";
import { getLigaZoneLabelByName } from "@/lib/liga-2026";
import { shouldIncludeMatchInChampionPool } from "@/lib/dummy-matches";
import { listMatches } from "@/lib/repositories/matches";
import { getProfile } from "@/lib/repositories/profile";
import { getTournamentFinalState } from "@/lib/repositories/tournament";
import { getCurrentSession, requireSession } from "@/lib/server-session";

export default async function ChampionPage() {
  await requireSession();

  const tournament = await getTournamentFinalState();
  if (tournament.finished) {
    redirect("/profile");
  }

  const [profile, matches, session] = await Promise.all([getProfile(), listMatches(), getCurrentSession()]);

  const teams = Array.from(
    new Map(
      matches
        .filter((match) => match.groupLabel && shouldIncludeMatchInChampionPool(match.id))
        .flatMap((match) => [
          { name: match.home.name, flag: match.home.flag, logo: match.home.logo, groupLabel: getLigaZoneLabelByName(match.home.name) ?? match.groupLabel },
          { name: match.away.name, flag: match.away.flag, logo: match.away.logo, groupLabel: getLigaZoneLabelByName(match.away.name) ?? match.groupLabel },
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
        locked={!isChampionPickAllowedFor(session?.displayName)}
        mode="checklist"
      />
    </main>
  );
}
