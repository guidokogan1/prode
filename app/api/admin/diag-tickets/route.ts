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

  const usersQuery = await supabase.from("users").select("id, display_name");
  if (usersQuery.error || !usersQuery.data) {
    return NextResponse.json({ ok: false, reason: usersQuery.error?.message }, { status: 500 });
  }

  const ticketsQuery = await supabase
    .from("tickets")
    .select("id, user_id, match_market_id, submitted_at, allocations:ticket_allocations(amount, market_outcome_id)")
    .order("submitted_at", { ascending: false });

  if (ticketsQuery.error || !ticketsQuery.data) {
    return NextResponse.json({ ok: false, reason: ticketsQuery.error?.message }, { status: 500 });
  }

  const userById = new Map(usersQuery.data.map((u) => [u.id, u.display_name]));
  const byUser: Record<string, { ticketCount: number; ticketsWithZeroAllocations: number; totalAllocationsAmount: number }> = {};

  for (const u of usersQuery.data) {
    byUser[u.display_name] = { ticketCount: 0, ticketsWithZeroAllocations: 0, totalAllocationsAmount: 0 };
  }

  for (const t of ticketsQuery.data) {
    const name = userById.get(t.user_id) ?? `unknown:${t.user_id.slice(0, 8)}`;
    if (!byUser[name]) byUser[name] = { ticketCount: 0, ticketsWithZeroAllocations: 0, totalAllocationsAmount: 0 };
    byUser[name].ticketCount += 1;
    const allocs = (t.allocations as { amount: number }[] | null) ?? [];
    const sum = allocs.reduce((a, b) => a + (b.amount ?? 0), 0);
    byUser[name].totalAllocationsAmount += sum;
    if (allocs.length === 0 || sum === 0) byUser[name].ticketsWithZeroAllocations += 1;
  }

  const recent = ticketsQuery.data.slice(0, 5).map((t) => ({
    user: userById.get(t.user_id) ?? `unknown`,
    matchMarketId: t.match_market_id,
    submittedAt: t.submitted_at,
    allocationCount: (t.allocations as unknown[] | null)?.length ?? 0,
    allocationSum: ((t.allocations as { amount: number }[] | null) ?? []).reduce((a, b) => a + (b.amount ?? 0), 0),
  }));

  return NextResponse.json({
    ok: true,
    total: ticketsQuery.data.length,
    byUser,
    recent,
  });
}
