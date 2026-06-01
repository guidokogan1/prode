import { getProductProvider } from "@/lib/product";

export async function getHistory() {
  const provider = await getProductProvider();
  return provider.getHistory();
}
