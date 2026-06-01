import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createOrVerifySession } from "@/lib/server-auth";
import { hasSupabaseServerEnv } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "remote auth unavailable" }, { status: 503 });
  }

  const body = (await request.json()) as { displayName?: string; pin?: string };
  const displayName = body.displayName?.trim() ?? "";
  const pin = body.pin?.trim() ?? "";

  if (displayName.length < 2) {
    return NextResponse.json({ error: "invalid display name" }, { status: 400 });
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "invalid pin" }, { status: 400 });
  }

  const result = await createOrVerifySession(displayName, pin);

  if (!result) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
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
}
