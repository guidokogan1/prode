import { deriveMarketStatus, deriveWinningOutcomeCode } from "@/lib/market-lifecycle";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type MatchRow = {
  id: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  home_team_id: string;
  away_team_id: string;
  home_score_90: number | null;
  away_score_90: number | null;
  winner_team_id: string | null;
};

type MarketRow = {
  id: string;
  market_type: "1x2" | "qualifies";
  status: "open" | "locked" | "revealed" | "settled";
  lock_at: string | null;
  winning_outcome_code: string | null;
};

export async function syncMatchMarket(matchId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase no esta configurado.",
    };
  }

  const [matchQuery, marketQuery] = await Promise.all([
    supabase
      .from("matches")
      .select("id, status, home_team_id, away_team_id, home_score_90, away_score_90, winner_team_id")
      .eq("id", matchId)
      .maybeSingle<MatchRow>(),
    supabase
      .from("match_markets")
      .select("id, market_type, status, lock_at, winning_outcome_code")
      .eq("match_id", matchId)
      .maybeSingle<MarketRow>(),
  ]);

  if (matchQuery.error || !matchQuery.data) {
    return {
      ok: false as const,
      reason: "No se encontro el partido.",
    };
  }

  if (marketQuery.error || !marketQuery.data) {
    return {
      ok: false as const,
      reason: "No se encontro el mercado del partido.",
    };
  }

  const match = matchQuery.data;
  const market = marketQuery.data;

  const winnerTeamSide =
    match.winner_team_id == null
      ? null
      : match.winner_team_id === match.home_team_id
        ? "home"
        : match.winner_team_id === match.away_team_id
          ? "away"
          : null;

  const winningOutcomeCode =
    market.winning_outcome_code ??
    deriveWinningOutcomeCode({
      marketType: market.market_type,
      homeScore90: match.home_score_90,
      awayScore90: match.away_score_90,
      winnerTeamSide,
      status: match.status,
    });

  const nextStatus = deriveMarketStatus({
    currentStatus: market.status,
    matchStatus: match.status,
    lockAt: market.lock_at,
    hasWinningOutcome: Boolean(winningOutcomeCode),
  });

  const isUnchanged =
    nextStatus === market.status && winningOutcomeCode === market.winning_outcome_code;

  if (isUnchanged) {
    return {
      ok: true as const,
      previousStatus: market.status,
      nextStatus,
      winningOutcomeCode,
      skipped: true as const,
    };
  }

  const updateQuery = await supabase
    .from("match_markets")
    .update({
      status: nextStatus,
      winning_outcome_code: winningOutcomeCode,
      reveal_at: nextStatus === "revealed" || nextStatus === "settled" ? new Date().toISOString() : null,
      settled_at: nextStatus === "settled" ? new Date().toISOString() : null,
    })
    .eq("id", market.id);

  if (updateQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudo sincronizar el mercado.",
    };
  }

  return {
    ok: true as const,
    previousStatus: market.status,
    nextStatus,
    winningOutcomeCode,
    skipped: false as const,
  };
}
