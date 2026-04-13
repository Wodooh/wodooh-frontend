import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for route protection.
 *
 * NOTE: Since we are using localStorage for session storage (frontend-only mock),
 * the middleware cannot directly read the session (localStorage is client-side).
 * In production, the JWT would be stored in an HTTP-only cookie, and this
 * middleware would validate the cookie server-side.
 *
 * For the frontend-only implementation, route protection is handled client-side
 * in each dashboard component. This middleware is here as scaffolding for when
 * the backend is ready and cookie-based auth is implemented.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = ["/login", "/", "/onboarding", "/onboarding/instructor"];
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/login") || pathname.startsWith("/onboarding")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // When backend is ready, uncomment and implement cookie-based auth check:
  // const token = request.cookies.get("wodooh_session")?.value;
  // if (!token && pathname.startsWith("/dashboard")) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

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
