import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const payload = (await request.json()) as { displayName?: string };
  const displayName = payload.displayName?.trim();
  if (!displayName) {
    return NextResponse.json({ ok: false, reason: "Falta displayName." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const result = await supabase.from("users").delete().ilike("display_name", displayName);
  if (result.error) {
    return NextResponse.json({ ok: false, reason: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: displayName });
}
