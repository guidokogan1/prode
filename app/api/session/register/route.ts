import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { registerSession } from "@/lib/server-auth";
import { hasSupabaseServerEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServerEnv()) {
      return NextResponse.json({ error: "remote auth unavailable" }, { status: 503 });
    }

    const body = (await request.json()) as { displayName?: string; pin?: string; confirmPin?: string };
    const displayName = body.displayName?.trim() ?? "";
    const pin = body.pin?.trim() ?? "";
    const confirmPin = body.confirmPin?.trim() ?? "";

    if (displayName.length < 2) {
      return NextResponse.json({ error: "invalid display name" }, { status: 400 });
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "invalid pin" }, { status: 400 });
    }

    if (pin !== confirmPin) {
      return NextResponse.json({ error: "pin mismatch" }, { status: 400 });
    }

    const result = await registerSession(displayName, pin);

    if (!result.ok) {
      const status = result.reason === "name_taken" ? 409 : 503;
      return NextResponse.json({ error: result.reason }, { status });
    }

    const cookieStore = await cookies();
    cookieStore.set("mundial_pool_session", result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 45,
    });

    return NextResponse.json({
      session: {
        kind: "remote",
        appMode: "supabase",
        displayName: result.displayName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected register error";
    return NextResponse.json({ error: "register_failed", detail: message }, { status: 500 });
  }
}
