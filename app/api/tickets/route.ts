import { NextRequest, NextResponse } from "next/server";
import type { SaveTicketPayload } from "@/lib/domain";
import { saveTicket } from "@/lib/repositories/tickets";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as SaveTicketPayload;
  const result = await saveTicket(payload);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
