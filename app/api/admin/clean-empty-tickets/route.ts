import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const ticketsQuery = await supabase
    .from("tickets")
    .select("id, allocations:ticket_allocations(amount)")
    .limit(5000);

  if (ticketsQuery.error || !ticketsQuery.data) {
    return NextResponse.json({ ok: false, reason: ticketsQuery.error?.message }, { status: 500 });
  }

  const emptyTicketIds = ticketsQuery.data
    .filter((t) => {
      const allocs = (t.allocations as { amount: number }[] | null) ?? [];
      const sum = allocs.reduce((a, b) => a + (b.amount ?? 0), 0);
      return allocs.length === 0 || sum === 0;
    })
    .map((t) => t.id);

  if (!emptyTicketIds.length) {
    return NextResponse.json({ ok: true, deleted: 0, message: "No empty tickets to clean." });
  }

  const del = await supabase.from("tickets").delete().in("id", emptyTicketIds);
  if (del.error) {
    return NextResponse.json({ ok: false, reason: del.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: emptyTicketIds.length });
}
