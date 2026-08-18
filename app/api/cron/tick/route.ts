import { NextRequest, NextResponse } from "next/server";
import { syncLiveScores } from "@/lib/repositories/live-scores";
import { processMatchLifecycle } from "@/lib/repositories/match-processing";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WINDOW_BEFORE_KICKOFF_MS = 10 * 60 * 1000;
const WINDOW_AFTER_KICKOFF_MS = 5 * 60 * 60 * 1000;

type WindowRow = {
  match_id: string;
  status: string;
  match: { kickoff_at: string; status: string } | { kickoff_at: string; status: string }[] | null;
};

function firstRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "CRON_SECRET no configurado." }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  if (process.env.TICK_DISABLED === "1") {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const now = Date.now();
  const windowStart = new Date(now - WINDOW_AFTER_KICKOFF_MS).toISOString();
  const windowEnd = new Date(now + WINDOW_BEFORE_KICKOFF_MS).toISOString();

  const windowQuery = await supabase
    .from("match_markets")
    .select("match_id, status, match:matches!inner(kickoff_at, status)")
    .neq("status", "settled")
    .gte("match.kickoff_at", windowStart)
    .lte("match.kickoff_at", windowEnd)
    .returns<WindowRow[]>();

  if (windowQuery.error) {
    return NextResponse.json({ ok: false, reason: windowQuery.error.message }, { status: 500 });
  }

  const inWindow = windowQuery.data ?? [];

  if (inWindow.length === 0) {
    return NextResponse.json({ ok: true, idle: true, inWindow: 0 });
  }

  const scores = await syncLiveScores();

  const processed = [];
  let settledNow = 0;
  let failed = 0;

  for (const row of inWindow) {
    const result = await processMatchLifecycle(row.match_id);
    const stage = result.ok ? result.stage : "error";

    if (result.ok && stage === "settled") {
      settledNow += 1;
    }

    if (!result.ok) {
      failed += 1;
    }

    processed.push({
      matchId: row.match_id,
      kickoffAt: firstRow(row.match)?.kickoff_at ?? null,
      previousMarketStatus: row.status,
      stage,
      reason: result.ok ? null : result.reason,
    });
  }

  const body = {
    ok: failed === 0,
    idle: false,
    inWindow: inWindow.length,
    scoresUpdated: scores.ok ? scores.actuallyUpdated : null,
    scoresError: scores.ok ? null : scores.reason,
    settledNow,
    failed,
    processed,
  };

  return NextResponse.json(body, { status: failed === 0 ? 200 : 500 });
}
