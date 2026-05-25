import { getFallbackHomeSummary, getFallbackMatches, getFallbackRanking } from "@/lib/mock-data";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { formatNetAmount } from "@/lib/game";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getHomeSummary() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackHomeSummary(demoPersona);
  }

  const [liveMatchesQuery, settledTodayQuery] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase
      .from("settlements")
      .select("id", { count: "exact", head: true })
      .gte("settled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  if (liveMatchesQuery.error || settledTodayQuery.error) {
    return getFallbackHomeSummary(demoPersona);
  }

  const session = await getCurrentSession();
  const matches = await getMatchesForHome();
  const pendingPicks = matches.filter((match) => match.userStateLabel === "Te falta jugar").length;
  let yourNet = "+0";

  if (session?.userId) {
    const leaderboardQuery = await supabase
      .from("leaderboard_snapshots")
      .select("total_net_amount")
      .eq("user_id", session.userId)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle<{ total_net_amount: number }>();

    if (!leaderboardQuery.error && leaderboardQuery.data) {
      yourNet = formatNetAmount(leaderboardQuery.data.total_net_amount);
    }
  }

  return {
    liveMatches: String(liveMatchesQuery.count ?? 0),
    pendingPicks: String(pendingPicks),
    settledToday: String(settledTodayQuery.count ?? 0),
    yourNet,
  };
}

export async function getMatchesForHome() {
  const matches = await getMatches();
  return matches.slice(0, 3);
}

async function getMatches() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackMatches(demoPersona);
  }

  return getFallbackMatches(demoPersona);
}

export async function getLeaderboardPreview() {
  const ranking = await getRanking();
  return ranking.slice(0, 5);
}

async function getRanking() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackRanking();
  }

  return getFallbackRanking();
}
