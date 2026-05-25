import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/server-auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("mundial_pool_session")?.value;

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  cookieStore.delete("mundial_pool_session");

  return NextResponse.json({ ok: true });
}
