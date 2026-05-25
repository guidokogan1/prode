import { NextResponse } from "next/server";
import { processAllMatchLifecycles } from "@/lib/repositories/match-processing";

export async function POST() {
  const result = await processAllMatchLifecycles();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
