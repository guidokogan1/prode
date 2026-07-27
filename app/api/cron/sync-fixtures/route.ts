import { NextRequest, NextResponse } from "next/server";
import { ingestLigaFixtures } from "@/lib/repositories/liga-fixtures";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const daysBack = Number(request.nextUrl.searchParams.get("daysBack") ?? 3);
  const daysAhead = Number(request.nextUrl.searchParams.get("daysAhead") ?? 10);

  const result = await ingestLigaFixtures({ daysBack, daysAhead });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
