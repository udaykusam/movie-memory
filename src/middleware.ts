import { NextResponse, type NextRequest } from "next/server";

// Sessions use the database strategy, so middleware (which can't query Postgres) only checks
// that a session cookie exists. This is a fast first gate; every page, server action and API
// route still validates the session against the database before touching user data.
const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

export function middleware(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSessionCookie) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/api/fact"],
};
