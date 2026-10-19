import { NextRequest, NextResponse } from "next/server";
import { isLocale, localeCookie } from "@/lib/i18n/shared";
export async function POST(request: NextRequest) {
  const json = request.headers
    .get("content-type")
    ?.includes("application/json");
  let value: unknown;
  try {
    value = json
      ? (await request.json()).locale
      : (await request.formData()).get("locale");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!isLocale(value))
    return NextResponse.json(
      { error: "Unsupported language" },
      { status: 400 },
    );
  const destination = new URL("/", request.url);
  // Next may normalize the internal URL to localhost; preserve the browser's host.
  const host = request.headers.get("host");
  if (host && /^[a-z0-9.\-:[\]]+$/i.test(host)) destination.host = host;
  try {
    const referrer = new URL(
      request.headers.get("referer") || "/",
      request.url,
    );
    if (referrer.origin === destination.origin) {
      destination.pathname = referrer.pathname;
      destination.search = referrer.search;
    }
  } catch {
    /* Fall back to the homepage. */
  }
  const response = json
    ? NextResponse.json({ locale: value })
    : NextResponse.redirect(destination, 303);
  response.cookies.set(localeCookie, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
