import { NextRequest, NextResponse } from "next/server";
import { settleMatchMarket } from "@/lib/repositories/settlements";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { matchId?: string };

  if (!body.matchId) {
    return NextResponse.json({ ok: false, reason: "matchId requerido" }, { status: 400 });
  }

  const result = await settleMatchMarket(body.matchId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
