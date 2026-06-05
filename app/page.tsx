import { HomePageClient } from "@/components/home-page-client";
import { isChampionPickLocked } from "@/lib/champion";
import { getHomeSummary, getMatchesForHome } from "@/lib/repositories/home";
import { getProfile } from "@/lib/repositories/profile";

const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

function toArtDateString(iso: string): string {
  return new Date(new Date(iso).getTime() + ART_OFFSET_MS).toISOString().slice(0, 10);
}

export default async function HomePage() {
  const [summary, featuredMatches, profile] = await Promise.all([
    getHomeSummary(),
    getMatchesForHome(),
    getProfile(),
  ]);

  const todayArt = toArtDateString(new Date().toISOString());
  const todayMatches = featuredMatches
    .filter((match) => match.kickoffAt && toArtDateString(match.kickoffAt) === todayArt)
    .sort((left, right) => (left.kickoffAt ?? "").localeCompare(right.kickoffAt ?? ""));

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
        needsChampionPick={needsChampionPick}
      />
    </main>
  );
}
