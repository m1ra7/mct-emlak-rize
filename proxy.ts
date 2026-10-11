import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
export function proxy(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith("/profil") ||
    req.nextUrl.pathname.startsWith("/auth")
  )
    return NextResponse.redirect(new URL("/", req.url));
  if (!getSessionCookie(req))
    return NextResponse.redirect(new URL("/yonetim/giris", req.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/admin/:path*", "/profil/:path*", "/auth/:path*"],
};
