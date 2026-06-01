import { getProductProvider } from "@/lib/product";

export async function getRanking() {
  const provider = await getProductProvider();
  return provider.getRanking();
}
