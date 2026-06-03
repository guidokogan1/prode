import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PickEvent = {
  id: string;
  kind: string;
  user_display_name: string;
  match_id: string | null;
  allocations: { label?: string; code?: string; amount: number }[] | null;
  created_at: string;
};

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const eventsQuery = await supabase
    .from("pick_events")
    .select("id, kind, user_display_name, match_id, allocations, created_at")
    .eq("kind", "match_pick")
    .order("created_at", { ascending: true })
    .returns<PickEvent[]>();

  if (eventsQuery.error || !eventsQuery.data) {
    return NextResponse.json({ ok: false, reason: eventsQuery.error?.message }, { status: 500 });
  }

  const latestByKey = new Map<string, PickEvent>();
  for (const ev of eventsQuery.data) {
    if (!ev.match_id || !ev.allocations?.length) continue;
    const key = `${ev.user_display_name}|${ev.match_id}`;
    latestByKey.set(key, ev);
  }

  const usersQuery = await supabase.from("users").select("id, display_name");
  if (usersQuery.error || !usersQuery.data) {
    return NextResponse.json({ ok: false, reason: usersQuery.error?.message }, { status: 500 });
  }
  const userIdByName = new Map(usersQuery.data.map((u) => [u.display_name, u.id]));

  const summary: Record<string, { recovered: number; skipped: number; errors: string[] }> = {};
  for (const ev of latestByKey.values()) {
    const name = ev.user_display_name;
    if (!summary[name]) summary[name] = { recovered: 0, skipped: 0, errors: [] };

    const userId = userIdByName.get(name);
    if (!userId) {
      summary[name].skipped += 1;
      continue;
    }

    const marketQuery = await supabase
      .from("match_markets")
      .select("id, market_type, match:matches(home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name))")
      .eq("match_id", ev.match_id!)
      .maybeSingle<{ id: string; market_type: string; match: unknown }>();

    if (marketQuery.error || !marketQuery.data) {
      summary[name].skipped += 1;
      continue;
    }

    const outcomesQuery = await supabase
      .from("market_outcomes")
      .select("id, code, label")
      .eq("match_market_id", marketQuery.data.id)
      .returns<{ id: string; code: string; label: string }[]>();

    if (outcomesQuery.error || !outcomesQuery.data) {
      summary[name].skipped += 1;
      continue;
    }

    const matched = ev.allocations!.map((a) => {
      const outcome = outcomesQuery.data!.find(
        (o) => (a.code && o.code === a.code) || o.label.toLowerCase() === (a.label ?? "").toLowerCase(),
      );
      return outcome ? { marketOutcomeId: outcome.id, amount: a.amount } : null;
    });

    if (matched.some((m) => !m)) {
      summary[name].skipped += 1;
      continue;
    }

    const ticketUpsert = await supabase
      .from("tickets")
      .upsert(
        { user_id: userId, match_market_id: marketQuery.data.id, credit_total: 10000, updated_at: new Date().toISOString() },
        { onConflict: "user_id,match_market_id" },
      )
      .select("id")
      .single<{ id: string }>();

    if (ticketUpsert.error || !ticketUpsert.data) {
      summary[name].errors.push(`ticket: ${ticketUpsert.error?.message}`);
      continue;
    }

    await supabase.from("ticket_allocations").delete().eq("ticket_id", ticketUpsert.data.id);
    const inserts = matched.map((m) => ({ ticket_id: ticketUpsert.data!.id, market_outcome_id: m!.marketOutcomeId, amount: m!.amount }));
    const insertResult = await supabase.from("ticket_allocations").insert(inserts);
    if (insertResult.error) {
      summary[name].errors.push(`allocations: ${insertResult.error.message}`);
      continue;
    }
    summary[name].recovered += 1;
  }

  return NextResponse.json({ ok: true, totalEvents: eventsQuery.data.length, latestKeys: latestByKey.size, summary });
}
