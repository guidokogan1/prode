import { NextRequest, NextResponse } from "next/server";
import { cleanupDummyMatches } from "@/lib/dummy-matches";
import { recomputeLeaderboardSnapshots } from "@/lib/repositories/settlements";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CleanupBody = {
  dryRun?: boolean;
  confirm?: string;
  backupConfirmed?: boolean;
};

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as CleanupBody;
  const result = await cleanupDummyMatches(supabase, body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (result.dryRun) {
    return NextResponse.json(result);
  }

  const leaderboard = await recomputeLeaderboardSnapshots();
  if (!leaderboard.ok) {
    return NextResponse.json(leaderboard, { status: 500 });
  }

  return NextResponse.json({
    ...result,
    leaderboard,
  });
}
