import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const marketQuery = await supabase
    .from("champion_market")
    .select("id, status, winning_team_id")
    .order("lock_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; status: string; winning_team_id: string | null }>();

  if (marketQuery.error || !marketQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se encontró el champion_market." }, { status: 404 });
  }

  if (marketQuery.data.status === "settled" && marketQuery.data.winning_team_id) {
    return NextResponse.json({ ok: true, alreadySettled: true });
  }

  const stagesQuery = await supabase
    .from("tournament_stages")
    .select("id, code, sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; code: string; sort_order: number }>();

  if (stagesQuery.error || !stagesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudo identificar la etapa final." }, { status: 500 });
  }

  const finalMatchQuery = await supabase
    .from("matches")
    .select("id, status, winner_team_id, home_score_ft, away_score_ft")
    .eq("stage_id", stagesQuery.data.id)
    .eq("status", "finished")
    .not("winner_team_id", "is", null)
    .maybeSingle<{ id: string; status: string; winner_team_id: string; home_score_ft: number | null; away_score_ft: number | null }>();

  if (finalMatchQuery.error) {
    return NextResponse.json({ ok: false, reason: finalMatchQuery.error.message }, { status: 500 });
  }

  if (!finalMatchQuery.data) {
    return NextResponse.json({ ok: true, settled: false, reason: "Final aún no jugada o sin ganador." });
  }

  const winnerTeamId = finalMatchQuery.data.winner_team_id;

  const marketUpdate = await supabase
    .from("champion_market")
    .update({
      status: "settled",
      winning_team_id: winnerTeamId,
      settled_at: new Date().toISOString(),
    })
    .eq("id", marketQuery.data.id);

  if (marketUpdate.error) {
    return NextResponse.json({ ok: false, reason: marketUpdate.error.message }, { status: 500 });
  }

  const picksQuery = await supabase
    .from("champion_picks")
    .select("id, team_id")
    .eq("champion_market_id", marketQuery.data.id);

  if (picksQuery.error || !picksQuery.data) {
    return NextResponse.json({ ok: true, settled: true, picksUpdated: 0, reason: "no se pudieron leer picks." });
  }

  const settledAt = new Date().toISOString();
  let picksUpdated = 0;
  for (const pick of picksQuery.data) {
    const isWinner = pick.team_id === winnerTeamId;
    const update = await supabase
      .from("champion_picks")
      .update({
        gross_return_amount: isWinner ? 10000 : 0,
        net_result_amount: isWinner ? 10000 : -10000,
        settled_at: settledAt,
      })
      .eq("id", pick.id);
    if (!update.error) picksUpdated += 1;
  }

  return NextResponse.json({
    ok: true,
    settled: true,
    winnerTeamId,
    picksUpdated,
    finalMatchId: finalMatchQuery.data.id,
  });
}
