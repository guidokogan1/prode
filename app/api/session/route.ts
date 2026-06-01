import { NextResponse } from "next/server";
import { getProductProvider } from "@/lib/product";

export async function GET() {
  const provider = await getProductProvider();
  const session = await provider.getSessionState();

  return NextResponse.json({ session });
}
