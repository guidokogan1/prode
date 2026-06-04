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
        background: "radial-gradient(ellipse 120% 60% at 50% 0%, #1C3A22 0%, #091409 55%)",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: 10,
        overflow: "hidden",
        minHeight: "calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom))",
      }}
    >
      <section className="split-row" style={{ paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.05rem" }}>⚽</span>
          <span
            style={{
              fontFamily: "var(--font-barlow), system-ui, sans-serif",
              fontWeight: 800,
              fontStyle: "normal",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              fontSize: ".96rem",
            }}
          >
            Mundial 26
          </span>
        </div>
      </section>

      <HomePageClient
        initialSummary={summary}
        featuredMatches={regularMatches}
        dummyMatches={dummyMatches}
        needsChampionPick={needsChampionPick}
      />
    </main>
  );
}
