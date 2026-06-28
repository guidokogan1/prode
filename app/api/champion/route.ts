import { NextRequest, NextResponse } from "next/server";
import { isChampionPickAllowedFor } from "@/lib/champion";
import { logPickEvent } from "@/lib/pick-events";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { teamName?: string };
  const teamName = payload.teamName?.trim();

  if (!teamName) {
    return NextResponse.json({ ok: false, reason: "Falta el equipo." }, { status: 400 });
  }

  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ ok: false, reason: "No hay sesión remota activa." }, { status: 401 });
  }

  if (!isChampionPickAllowedFor(session.displayName)) {
    return NextResponse.json({ ok: false, reason: "El campeón ya quedó cerrado." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no está configurado." }, { status: 500 });
  }

  const teamQuery = await supabase
    .from("teams")
    .select("id, name")
    .ilike("name", teamName)
    .maybeSingle<{ id: string; name: string }>();

  if (teamQuery.error || !teamQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se encontró ese equipo." }, { status: 404 });
  }

  const marketQuery = await supabase
    .from("champion_market")
    .select("id, status")
    .order("lock_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (marketQuery.error || !marketQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se encontró el mercado de campeón." }, { status: 500 });
  }

  const upsert = await supabase.from("champion_picks").upsert(
    {
      champion_market_id: marketQuery.data.id,
      user_id: session.userId,
      team_id: teamQuery.data.id,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "champion_market_id,user_id" },
  );

  if (upsert.error) {
    return NextResponse.json({ ok: false, reason: "No se pudo guardar el campeón." }, { status: 500 });
  }

  await logPickEvent({
    kind: "champion_pick",
    userDisplayName: session.displayName ?? "unknown",
    teamName: teamQuery.data.name,
  });

  return NextResponse.json({ ok: true, teamName: teamQuery.data.name });
}
