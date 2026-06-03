import { cache } from "react";
import type { ProductProvider } from "@/lib/domain";
import { DemoProductProvider } from "@/lib/product/demo-provider";
import { SupabaseProductProvider } from "@/lib/product/supabase-provider";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getProductProvider = cache(async (): Promise<ProductProvider> => {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return new DemoProductProvider();
  }
  return new SupabaseProductProvider();
});
