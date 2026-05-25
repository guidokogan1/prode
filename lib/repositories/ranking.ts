import { getFallbackRanking } from "@/lib/mock-data";
import { getRankingFromSnapshots } from "@/lib/repositories/settlements";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getRanking() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackRanking();
  }

  return getRankingFromSnapshots();
}
