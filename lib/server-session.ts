import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/server-auth";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("mundial_pool_session")?.value;

  if (!sessionToken) {
    return null;
  }

  return getSessionUser(sessionToken);
}
