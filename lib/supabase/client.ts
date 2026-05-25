import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseBrowserEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  browserClient = createClient(url, anonKey);
  return browserClient;
}
