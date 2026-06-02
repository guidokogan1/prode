import type { ProductProvider } from "@/lib/domain";
import { DemoProductProvider } from "@/lib/product/demo-provider";
import { SupabaseProductProvider } from "@/lib/product/supabase-provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getProductProvider(): Promise<ProductProvider> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return new DemoProductProvider();
  }
  return new SupabaseProductProvider();
}
