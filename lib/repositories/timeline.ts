import { getProductProvider } from "@/lib/product";

export async function getRankingTimeline() {
  const provider = await getProductProvider();
  return provider.getRankingTimeline();
}
