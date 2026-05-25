import { cookies } from "next/headers";
import { getDefaultDemoPersonaSlug, isDemoPersonaSlug, type DemoPersonaSlug } from "@/lib/mock-data";

export const DEMO_PERSONA_COOKIE = "mundial_pool_demo_persona";

export async function getActiveDemoPersonaSlug(): Promise<DemoPersonaSlug> {
  const cookieStore = await cookies();
  const value = cookieStore.get(DEMO_PERSONA_COOKIE)?.value;

  return isDemoPersonaSlug(value) ? value : getDefaultDemoPersonaSlug();
}
