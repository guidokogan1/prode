import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getFallbackProfile } from "@/lib/mock-data";
import { getSessionUser } from "@/lib/server-auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("mundial_pool_session")?.value;
  const demoPersona = await getActiveDemoPersonaSlug();
  const demoProfile = getFallbackProfile(demoPersona);

  if (!sessionToken) {
    return NextResponse.json({
      session: {
        displayName: demoProfile.name,
        mode: "demo",
      },
    });
  }

  const session = await getSessionUser(sessionToken);

  return NextResponse.json({
    session: session ?? {
      displayName: demoProfile.name,
      mode: "demo",
    },
  });
}
