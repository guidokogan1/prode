import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseServerEnv } from "@/lib/supabase/env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseServerClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    return null;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
