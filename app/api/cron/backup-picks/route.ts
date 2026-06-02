import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BACKUP_BUCKET = "pick-backups";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "CRON_SECRET no configurado." }, { status: 500 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const { data: events, error } = await supabase
    .from("pick_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `pick-events-${stamp}.json`;
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), count: events.length, events }, null, 2);

  const upload = await supabase.storage.from(BACKUP_BUCKET).upload(filename, body, {
    contentType: "application/json",
    upsert: false,
  });

  if (upload.error) {
    return NextResponse.json(
      {
        ok: false,
        reason: upload.error.message,
        hint: `Create a private storage bucket named "${BACKUP_BUCKET}" in Supabase Studio.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, filename, count: events.length });
}
