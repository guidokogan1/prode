import { NextRequest, NextResponse } from "next/server";
import { ingestLigaFixtures } from "@/lib/repositories/liga-fixtures";
import { processAllMatchLifecycles } from "@/lib/repositories/match-processing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const daysBack = Number(request.nextUrl.searchParams.get("daysBack") ?? 3);
  const daysAhead = Number(request.nextUrl.searchParams.get("daysAhead") ?? 10);

  const fixtures = await ingestLigaFixtures({ daysBack, daysAhead });
  const lifecycle = await processAllMatchLifecycles();

  return NextResponse.json({ fixtures, lifecycle }, { status: fixtures.ok && lifecycle.ok ? 200 : 502 });
}
