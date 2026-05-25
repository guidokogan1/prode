import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_PERSONA_COOKIE,
} from "@/lib/demo-state";
import { getDefaultDemoPersonaSlug, getDemoPersonas, isDemoPersonaSlug } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { persona?: string };
  const persona = isDemoPersonaSlug(body.persona) ? body.persona : getDefaultDemoPersonaSlug();
  const selectedPersona = getDemoPersonas().find((candidate) => candidate.slug === persona);
  const cookieStore = await cookies();

  cookieStore.set(DEMO_PERSONA_COOKIE, persona, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 45,
  });

  return NextResponse.json({
    ok: true,
    persona,
    profile: selectedPersona,
  });
}
