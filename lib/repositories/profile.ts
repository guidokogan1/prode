import { getFallbackProfile } from "@/lib/mock-data";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { formatNetAmount } from "@/lib/game";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getProfile() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackProfile(demoPersona);
  }

  const session = await getCurrentSession();

  if (!session?.userId) {
    return getFallbackProfile(demoPersona);
  }

  const [userQuery, leaderboardQuery, championQuery] = await Promise.all([
    supabase.from("users").select("display_name").eq("id", session.userId).maybeSingle<{ display_name: string }>(),
    supabase
      .from("leaderboard_snapshots")
      .select("total_net_amount, positive_tickets_count, best_single_net_amount")
      .eq("user_id", session.userId)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle<{ total_net_amount: number; positive_tickets_count: number; best_single_net_amount: number | null }>(),
    supabase
      .from("champion_picks")
      .select("team:teams(name)")
      .eq("user_id", session.userId)
      .maybeSingle<{ team: { name: string } | null }>(),
  ]);

  if (userQuery.error || !userQuery.data) {
    return getFallbackProfile(demoPersona);
  }

  return {
    name: userQuery.data.display_name,
    netLabel: formatNetAmount(leaderboardQuery.data?.total_net_amount ?? 0),
    positiveTickets: leaderboardQuery.data?.positive_tickets_count ?? 0,
    bestHit: formatNetAmount(leaderboardQuery.data?.best_single_net_amount ?? 0),
    championPick: championQuery.data?.team?.name ?? "Sin elegir",
  };
}
