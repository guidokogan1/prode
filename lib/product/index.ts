import type { ProductProvider } from "@/lib/domain";
import { DemoProductProvider } from "@/lib/product/demo-provider";
import { SupabaseProductProvider } from "@/lib/product/supabase-provider";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getProductProvider(): Promise<ProductProvider> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return new DemoProductProvider();
  }

  const remoteSession = await getCurrentSession();
  if (remoteSession?.userId) {
    return new SupabaseProductProvider();
  }

  return new DemoProductProvider();
}
