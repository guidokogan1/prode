import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { loginSession } from "@/lib/server-auth";
import { hasSupabaseServerEnv } from "@/lib/supabase/env";

function getRouteErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      detail?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.detail === "string" && candidate.detail.length > 0 ? candidate.detail : null,
      typeof candidate.details === "string" && candidate.details.length > 0 ? candidate.details : null,
      typeof candidate.hint === "string" && candidate.hint.length > 0 ? candidate.hint : null,
      typeof candidate.code === "string" && candidate.code.length > 0 ? `code ${candidate.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  return "unexpected login error";
}

export async function POST(request: NextRequest) {
  try {
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

    const result = await loginSession(displayName, pin);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.reason === "unavailable" ? 503 : 401 });
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
    const message = getRouteErrorDetail(error);
    console.error("[auth/login]", message);
    return NextResponse.json({ error: "login_failed", detail: message }, { status: 500 });
  }
}
