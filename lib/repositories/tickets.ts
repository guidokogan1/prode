import type { SaveTicketPayload } from "@/lib/domain";
import { getProductProvider } from "@/lib/product";

export async function saveTicket(payload: SaveTicketPayload) {
  const provider = await getProductProvider();
  return provider.submitTicket(payload);
}
