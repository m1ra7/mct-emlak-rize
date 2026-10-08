export class AuthConfigurationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "AuthConfigurationError";
  }
}
export function authSettings() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new AuthConfigurationError("AUTH_SECRET_MISSING");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AuthConfigurationError("ADMIN_EMAIL_MISSING");
  const raw =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AuthConfigurationError("AUTH_URL_INVALID");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    throw new AuthConfigurationError("AUTH_URL_INVALID");
  const trustedOrigins = [url.origin];
  if (
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)
  ) {
    for (const host of ["localhost", "127.0.0.1", "0.0.0.0"])
      trustedOrigins.push(
        `${url.protocol}//${host}${url.port ? ":" + url.port : ""}`,
      );
  }
  return {
    secret,
    email,
    baseURL: url.origin,
    secureCookies: url.protocol === "https:",
    trustedOrigins: [...new Set(trustedOrigins)],
  };
}
