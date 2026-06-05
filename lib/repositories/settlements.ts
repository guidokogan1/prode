import { formatNetAmount, settleTicket } from "@/lib/game";
import { getFallbackRanking } from "@/lib/mock-data";
import { computeLeaderboard, computeMarketSettlements } from "@/lib/settlement-engine";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type MarketRow = {
  id: string;
  winning_outcome_code: string | null;
  status: string;
};

type AllocationRow = {
  ticket_id: string;
  amount: number;
  ticket: {
    user_id: string;
  } | null;
  outcome: {
    code: string;
  } | null;
};

type UserNetRow = {
  user_id: string;
  total_net_amount: number;
  positive_tickets_count: number;
  best_single_net_amount: number | null;
  user: {
    display_name: string;
  } | null;
};

export async function settleMatchMarket(matchId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase no esta configurado.",
    };
  }

  const marketQuery = await supabase
    .from("match_markets")
    .select("id, winning_outcome_code, status")
    .eq("match_id", matchId)
    .maybeSingle<MarketRow>();

  if (marketQuery.error || !marketQuery.data) {
    return {
      ok: false as const,
      reason: "No se encontro el mercado del partido.",
    };
  }

  const market = marketQuery.data;

  if (!market.winning_outcome_code) {
    return {
      ok: false as const,
      reason: "El mercado todavia no tiene outcome ganador.",
    };
  }

  const allocationsQuery = await supabase
    .from("ticket_allocations")
    .select("ticket_id, amount, ticket:tickets!inner(user_id, match_market_id), outcome:market_outcomes(code)")
    .eq("ticket.match_market_id", market.id)
    .returns<AllocationRow[]>();

  if (allocationsQuery.error || !allocationsQuery.data?.length) {
    return {
      ok: false as const,
      reason: "No hay jugadas para liquidar en este mercado.",
    };
  }

  let settlementResult;
  try {
    settlementResult = computeMarketSettlements(
      allocationsQuery.data.map((row) => ({
        ticketId: row.ticket_id,
        outcomeCode: row.outcome?.code ?? "",
        amount: row.amount,
      })),
      market.winning_outcome_code,
    );
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "No se pudo liquidar el mercado.",
    };
  }

  const deleteExisting = await supabase.from("settlements").delete().in(
    "ticket_id",
    [...new Set(allocationsQuery.data.map((row) => row.ticket_id))],
  );

  if (deleteExisting.error) {
    return {
      ok: false as const,
      reason: "No se pudieron limpiar settlements previos.",
    };
  }

  const settlements = settlementResult.rows.map((row) => ({
    ticket_id: row.ticketId,
    winning_outcome_code: market.winning_outcome_code!,
    winning_pool_amount: settlementResult.winningPool,
    total_pool_amount: settlementResult.totalPool,
    winning_bet_amount: row.winningBetAmount,
    gross_return_amount: row.grossReturnAmount,
    net_result_amount: row.netResultAmount,
    settled_at: new Date().toISOString(),
  }));

  const insertSettlements = await supabase.from("settlements").insert(settlements);

  if (insertSettlements.error) {
    return {
      ok: false as const,
      reason: "No se pudieron guardar los settlements.",
    };
  }

  const settleMarket = await supabase
    .from("match_markets")
    .update({
      status: "settled",
      settled_at: new Date().toISOString(),
    })
    .eq("id", market.id);

  if (settleMarket.error) {
    return {
      ok: false as const,
      reason: "Se liquidaron tickets pero fallo el cierre del mercado.",
    };
  }

  const leaderboard = await recomputeLeaderboardSnapshots();

  if (!leaderboard.ok) {
    return leaderboard;
  }

  return {
    ok: true as const,
    message: `Mercado liquidado. Pozo total ${settlementResult.totalPool}.`,
    totalPool: settlementResult.totalPool,
    winningPool: settlementResult.winningPool,
  };
}

export async function recomputeLeaderboardSnapshots() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase no esta configurado.",
    };
  }

  const rankingQuery = await supabase
    .from("settlements")
    .select("net_result_amount, ticket:tickets(user_id, user:users(display_name))")
    .returns<
      {
        net_result_amount: number;
        ticket: {
          user_id: string;
          user: {
            display_name: string;
          } | null;
        } | null;
      }[]
    >();

  if (rankingQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudieron leer los settlements para ranking.",
    };
  }

  const sorted = computeLeaderboard(
    (rankingQuery.data ?? [])
      .map((row) => {
        const userId = row.ticket?.user_id;
        const displayName = row.ticket?.user?.display_name;

        if (!userId || !displayName) {
          return null;
        }

        return {
          userId,
          displayName,
          netResultAmount: row.net_result_amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  );

  await supabase.from("leaderboard_snapshots").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (sorted.length) {
    const insertSnapshots = await supabase.from("leaderboard_snapshots").insert(
      sorted.map((row, index) => ({
        user_id: row.userId,
        as_of: new Date().toISOString(),
        rank_position: index + 1,
        total_net_amount: Number(row.totalNetAmount.toFixed(2)),
        positive_tickets_count: row.positiveTicketsCount,
        best_single_net_amount: row.bestSingleNetAmount,
      })),
    );

    if (insertSnapshots.error) {
      return {
        ok: false as const,
        reason: "No se pudieron guardar snapshots del ranking.",
      };
    }
  }

  return {
    ok: true as const,
    preview: sorted.map((row) => ({
      position: row.position,
      name: row.name,
      netLabel: row.netLabel,
    })),
  };
}

export async function getRankingFromSnapshots() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackRanking();
  }

  const query = await supabase
    .from("leaderboard_snapshots")
    .select("rank_position, total_net_amount, positive_tickets_count, best_single_net_amount, user:users(display_name)")
    .order("rank_position", { ascending: true })
    .returns<
      {
        rank_position: number;
        total_net_amount: number;
        positive_tickets_count: number;
        best_single_net_amount: number | null;
        user: {
          display_name: string;
        } | null;
      }[]
    >();

  if (query.error || !query.data?.length) {
    return getFallbackRanking();
  }

  return query.data.map((row) => ({
    position: row.rank_position,
    name: row.user?.display_name ?? "Jugador",
    netAmount: row.total_net_amount,
    positiveTickets: row.positive_tickets_count,
    bestHitAmount: row.best_single_net_amount ?? 0,
  }));
}
