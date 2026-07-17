import { syncDummyMatchesLifecycle } from "@/lib/dummy-matches";
import { syncMatchMarket } from "@/lib/repositories/market-sync";
import { recomputeLeaderboardSnapshots, settleMatchMarket } from "@/lib/repositories/settlements";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function processMatchLifecycle(matchId: string) {
  const syncResult = await syncMatchMarket(matchId);

  if (!syncResult.ok) {
    return syncResult;
  }

  if (
    syncResult.nextStatus === "settled" &&
    syncResult.winningOutcomeCode &&
    syncResult.previousStatus !== "settled"
  ) {
    const settlementResult = await settleMatchMarket(matchId);

    if (!settlementResult.ok) {
      return settlementResult;
    }

    return {
      ok: true as const,
      stage: "settled",
      sync: syncResult,
      settlement: settlementResult,
    };
  }

  if (syncResult.nextStatus === "revealed" && syncResult.previousStatus !== "revealed") {
    const leaderboardResult = await recomputeLeaderboardSnapshots();

    if (!leaderboardResult.ok) {
      return leaderboardResult;
    }

    return {
      ok: true as const,
      stage: "revealed",
      sync: syncResult,
      leaderboard: leaderboardResult,
    };
  }

  return {
    ok: true as const,
    stage: syncResult.nextStatus,
    sync: syncResult,
  };
}

export async function processAllMatchLifecycles() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      reason: "Supabase no esta configurado.",
    };
  }

  const dummySync = await syncDummyMatchesLifecycle(supabase);

  if (!dummySync.ok) {
    return dummySync;
  }

  const matchesQuery = await supabase
    .from("matches")
    .select("id")
    .in("status", ["scheduled", "live", "finished"])
    .returns<{ id: string }[]>();

  if (matchesQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudieron cargar los partidos para procesar.",
    };
  }

  const results = [];

  for (const match of matchesQuery.data ?? []) {
    const result = await processMatchLifecycle(match.id);
    results.push({
      matchId: match.id,
      ok: result.ok,
      stage: result.ok ? result.stage : "error",
      reason: result.ok ? null : result.reason,
    });
  }

  return {
    ok: true as const,
    dummySync,
    processed: results.length,
    results,
  };
}
