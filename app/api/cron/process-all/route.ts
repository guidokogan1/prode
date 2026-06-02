import { NextRequest, NextResponse } from "next/server";
import { processAllMatchLifecycles } from "@/lib/repositories/match-processing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "CRON_SECRET no configurado." }, { status: 500 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const result = await processAllMatchLifecycles();
  const finishedAt = new Date().toISOString();

  return NextResponse.json({ startedAt, finishedAt, result }, { status: result.ok ? 200 : 500 });
}
