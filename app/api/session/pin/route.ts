import { NextRequest, NextResponse } from "next/server";
import { changeUserPin } from "@/lib/server-auth";
import { hasSupabaseServerEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json({ error: "remote auth unavailable" }, { status: 503 });
    }

    const body = (await request.json()) as {
      displayName?: string;
      currentPin?: string;
      nextPin?: string;
      confirmPin?: string;
    };

    const displayName = body.displayName?.trim() ?? "";
    const currentPin = body.currentPin?.trim() ?? "";
    const nextPin = body.nextPin?.trim() ?? "";
    const confirmPin = body.confirmPin?.trim() ?? "";

    if (displayName.length < 2) {
      return NextResponse.json({ error: "invalid display name" }, { status: 400 });
    }

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(nextPin)) {
      return NextResponse.json({ error: "invalid pin" }, { status: 400 });
    }

    if (nextPin !== confirmPin) {
      return NextResponse.json({ error: "pin mismatch" }, { status: 400 });
    }

    const result = await changeUserPin(displayName, currentPin, nextPin);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.reason === "unavailable" ? 503 : 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected pin error";
    return NextResponse.json({ error: "pin_change_failed", detail: message }, { status: 500 });
  }
}
