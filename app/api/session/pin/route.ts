import { NextRequest, NextResponse } from "next/server";
import { changeUserPin } from "@/lib/server-auth";
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

  return "unexpected pin error";
}

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
    const message = getRouteErrorDetail(error);
    console.error("[auth/pin]", message);
    return NextResponse.json({ error: "pin_change_failed", detail: message }, { status: 500 });
  }
}
