import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWorldCupTeamMeta } from "@/lib/world-cup-2026";

export type TournamentFinalState = {
  finished: boolean;
  winnerTeam: { name: string; flag: string; fifaCode: string } | null;
  winnerUserName: string | null;
  settledAt: string | null;
};

export const getTournamentFinalState = cache(async (): Promise<TournamentFinalState> => {
  const empty: TournamentFinalState = {
    finished: false,
    winnerTeam: null,
    winnerUserName: null,
    settledAt: null,
  };

  const supabase = getSupabaseServerClient();
  if (!supabase) return empty;

  const marketQuery = await supabase
    .from("champion_market")
    .select("status, winning_team_id, settled_at, team:teams(name, fifa_code)")
    .order("lock_at", { ascending: true })
    .limit(1)
    .maybeSingle<{
      status: string;
      winning_team_id: string | null;
      settled_at: string | null;
      team: { name: string; fifa_code: string } | null;
    }>();

  if (marketQuery.error || !marketQuery.data) return empty;
  if (marketQuery.data.status !== "settled" || !marketQuery.data.team) return empty;

  const winnerSnapshot = await supabase
    .from("leaderboard_snapshots")
    .select("rank_position, user:users(display_name)")
    .eq("rank_position", 1)
    .maybeSingle<{ rank_position: number; user: { display_name: string } | null }>();

  const flag = getWorldCupTeamMeta(marketQuery.data.team.fifa_code)?.flag ?? "🏳️";

  return {
    finished: true,
    winnerTeam: {
      name: marketQuery.data.team.name,
      fifaCode: marketQuery.data.team.fifa_code,
      flag,
    },
    winnerUserName: winnerSnapshot.data?.user?.display_name ?? null,
    settledAt: marketQuery.data.settled_at,
  };
});
