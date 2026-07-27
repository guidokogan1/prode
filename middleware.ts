import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];
const OPEN_PATHS = ["/preview"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("mundial_pool_session")?.value);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isOpenPath = OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isOpenPath) {
    return NextResponse.next();
  }

  if (!hasSession && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (!isPublicPath) {
    response.headers.set("Cache-Control", "private, no-store, must-revalidate");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\..*).*)"],
};
