import { isDummyMatchId } from "@/lib/dummy-matches";
import { HomePageClient } from "@/components/home-page-client";
import { isChampionPickLocked } from "@/lib/champion";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";
import { getProfile } from "@/lib/repositories/profile";

export default async function HomePage() {
  const [summary, featuredMatches, profile] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getProfile(),
  ]);
  const dummyMatches = featuredMatches.filter((match) => isDummyMatchId(match.id));
  const regularMatches = featuredMatches.filter((match) => !isDummyMatchId(match.id));

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
        featuredMatches={regularMatches}
        dummyMatches={dummyMatches}
        needsChampionPick={needsChampionPick}
      />
    </main>
  );
}
