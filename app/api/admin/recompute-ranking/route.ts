import { NextResponse } from "next/server";
import { recomputeLeaderboardSnapshots } from "@/lib/repositories/settlements";

export async function POST() {
  const result = await recomputeLeaderboardSnapshots();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
