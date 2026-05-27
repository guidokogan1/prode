import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { processAllMatchLifecycles } from "@/lib/repositories/match-processing";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const result = await processAllMatchLifecycles();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
