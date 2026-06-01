import type { AppMode, SessionState } from "@/lib/domain";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { getFallbackProfile } from "@/lib/mock-data";
import { getCurrentSession } from "@/lib/server-session";

export async function getServerSessionState(appMode: AppMode): Promise<SessionState> {
  const demoPersonaSlug = await getSafeDemoPersonaSlug();
  const demoProfile = getFallbackProfile(demoPersonaSlug);
  const remoteSession = await getCurrentSession();

  if (remoteSession?.userId) {
    return {
      kind: "remote",
      appMode,
      userId: remoteSession.userId,
      displayName: remoteSession.displayName,
      demoPersonaSlug,
    };
  }

  if (appMode === "demo") {
    return {
      kind: "demo",
      appMode,
      displayName: demoProfile.name,
      demoPersonaSlug,
    };
  }

  return {
    kind: "anonymous",
    appMode,
    displayName: null,
    demoPersonaSlug,
  };
}

async function getSafeDemoPersonaSlug() {
  try {
    return await getActiveDemoPersonaSlug();
  } catch {
    return "guido";
  }
}
