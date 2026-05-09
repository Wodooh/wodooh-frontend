import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (formerly "middleware" — renamed in v16, see
 * https://nextjs.org/docs/messages/middleware-to-proxy).
 *
 * The JWT lives in localStorage on the client, so this Edge-runtime proxy
 * cannot read the session directly. Route protection is enforced client-side
 * by ProtectedRoute and the per-role layouts (auth gate + redirects).
 *
 * This file is scaffolding for when the JWT is moved to an HTTP-only cookie:
 * uncomment the cookie check below and the proxy will validate the session
 * before the request reaches the page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = ["/login", "/", "/onboarding", "/onboarding/instructor"];
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/login") || pathname.startsWith("/onboarding")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // When the JWT migrates to an HTTP-only cookie, replace the client-side
  // ProtectedRoute gate with the check below:
  //   const token = request.cookies.get("wodooh_session")?.value;
  //   if (!token && pathname.startsWith("/dashboard")) {
  //     return NextResponse.redirect(new URL("/login", request.url));
  //   }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files (svg, png, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
