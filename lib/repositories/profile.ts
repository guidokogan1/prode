import { getProductProvider } from "@/lib/product";

export async function getProfile() {
  const provider = await getProductProvider();
  return provider.getProfile();
}
