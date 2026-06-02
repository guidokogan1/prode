import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const [users, tickets, championPicks, pickEvents, matchesOpen, matchesSettled] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("tickets").select("*", { count: "exact", head: true }),
    supabase.from("champion_picks").select("*", { count: "exact", head: true }),
    supabase.from("pick_events").select("*", { count: "exact", head: true }),
    supabase.from("match_markets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("match_markets").select("*", { count: "exact", head: true }).eq("status", "settled"),
  ]);

  const lastEvent = await supabase
    .from("pick_events")
    .select("created_at, kind, user_display_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    counts: {
      users: users.count ?? null,
      tickets: tickets.count ?? null,
      championPicks: championPicks.count ?? null,
      pickEvents: pickEvents.count ?? null,
      matchesOpen: matchesOpen.count ?? null,
      matchesSettled: matchesSettled.count ?? null,
    },
    lastPickEvent: lastEvent.data ?? null,
  });
}
