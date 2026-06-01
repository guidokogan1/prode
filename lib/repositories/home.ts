import { getProductProvider } from "@/lib/product";

export async function getHomeSummary() {
  const provider = await getProductProvider();
  return provider.getHomeSummary();
}

export async function getMatchesForHome() {
  const provider = await getProductProvider();
  return provider.getMatchesForHome();
}

export async function getLeaderboardPreview() {
  const provider = await getProductProvider();
  const ranking = await provider.getRanking();
  return ranking.slice(0, 5);
}
