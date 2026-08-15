import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProductProvider } from "@/lib/product";
import { SESSION_COOKIE } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = await getProductProvider();
  const session = await provider.getSessionState();

  const response = NextResponse.json({ session });

  if (session.kind !== "remote") {
    const cookieStore = await cookies();
    if (cookieStore.get(SESSION_COOKIE)?.value) {
      response.cookies.delete(SESSION_COOKIE);
    }
  }

  return response;
}
