import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/server-session";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export async function isAdminRequestAuthorized(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY?.trim();
  const providedKey = request.headers.get("x-admin-key")?.trim();

  if (adminKey) {
    return providedKey === adminKey;
  }

  const allowedNames = (process.env.ADMIN_DISPLAY_NAMES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeName);

  if (allowedNames.length) {
    const session = await getCurrentSession();
    if (!session?.displayName) {
      return false;
    }

    return allowedNames.includes(normalizeName(session.displayName));
  }

  return process.env.NODE_ENV !== "production";
}
