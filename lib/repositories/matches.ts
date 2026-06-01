import { getProductProvider } from "@/lib/product";

export async function listMatches() {
  const provider = await getProductProvider();
  return provider.listMatches();
}

export async function listMatchesByStage() {
  const provider = await getProductProvider();
  return provider.listMatchesByStage();
}

export async function getMatchById(id: string) {
  const provider = await getProductProvider();
  return provider.getMatchDetail(id);
}
