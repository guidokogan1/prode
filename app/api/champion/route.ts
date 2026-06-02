import { NextRequest, NextResponse } from "next/server";
import { isChampionPickLocked } from "@/lib/champion";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { teamName?: string };
  const teamName = payload.teamName?.trim();

  if (!teamName) {
    return NextResponse.json({ ok: false, reason: "Falta el equipo." }, { status: 400 });
  }

  if (isChampionPickLocked()) {
    return NextResponse.json({ ok: false, reason: "El campeón ya quedó cerrado." }, { status: 400 });
  }

  const session = await getCurrentSession();
  if (!session?.userId) {
    return NextResponse.json({ ok: false, reason: "No hay sesión remota activa." }, { status: 401 });
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

  const upsert = await supabase.from("champion_picks").upsert(
    {
      user_id: session.userId,
      team_id: teamQuery.data.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsert.error) {
    return NextResponse.json({ ok: false, reason: "No se pudo guardar el campeón." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teamName: teamQuery.data.name });
}
