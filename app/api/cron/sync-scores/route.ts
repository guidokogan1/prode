import { NextRequest, NextResponse } from "next/server";
import { syncLiveScores } from "@/lib/repositories/live-scores";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const result = await syncLiveScores();

  if (!result.ok) {
    return NextResponse.json(result, { status: result.httpStatus ?? 500 });
  }

  return NextResponse.json(result);
}
