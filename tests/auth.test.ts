import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { authSettings, AuthConfigurationError } from "../lib/auth-config";
import { createAuthentication } from "../lib/auth";
import { provisionAdmin } from "../lib/admin-account";
import { forwardAuthRequest } from "../lib/auth-http";
import { authErrorMessage } from "../lib/auth-messages";
import { themeInit, validTheme } from "../lib/theme";
import { runInNewContext } from "node:vm";
const secret = "test-only-secret-over-thirty-two-characters";
function setup() {
  Object.assign(process.env, {
    BETTER_AUTH_SECRET: secret,
    ADMIN_EMAIL: "owner@example.com",
    BETTER_AUTH_URL: "https://mct.example",
    NODE_ENV: "production",
  });
}
test("Auth configuration and actionable errors", () => {
  setup();
  assert.equal(authSettings().baseURL, "https://mct.example");
  process.env.BETTER_AUTH_SECRET = "short";
  assert.throws(() => authSettings(), AuthConfigurationError);
  process.env.BETTER_AUTH_SECRET = secret;
  process.env.BETTER_AUTH_URL = "http://public.example";
  assert.throws(() => authSettings(), AuthConfigurationError);
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  assert.equal(authSettings().secureCookies, false);
  Object.assign(process.env, { NODE_ENV: "development" });
  assert.ok(authSettings().trustedOrigins.includes("http://127.0.0.1:3000"));
  assert.ok(authErrorMessage({ status: 500 }).includes("admin:check"));
  assert.ok(
    authErrorMessage({ code: "OWNER_ACCESS_DENIED", status: 403 }).includes(
      "ADMIN_EMAIL",
    ),
  );
  assert.ok(
    authErrorMessage({
      code: "INVALID_EMAIL_OR_PASSWORD",
      status: 401,
    }).includes("E-posta veya şifre"),
  );
  setup();
});
test("Owner repair and actual production HTTP login/logout, no SMTP required", async () => {
  setup();
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_FROM;
  const pg = new PGlite();
  try {
    for (const file of (await readdir("db/migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort())
      await pg.exec(await readFile(`db/migrations/${file}`, "utf8"));
    const d = drizzle(pg, { schema });
    const id = crypto.randomUUID();
    await d.insert(schema.user).values({
      id,
      email: "owner@example.com",
      name: "MCT Owner",
      role: "user",
      active: false,
      emailVerified: false,
    });
    await d.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: "legacy-incorrect-id",
      userId: id,
      providerId: "credential",
      password: "broken-hash",
    });
    await d.insert(schema.session).values({
      id: crypto.randomUUID(),
      token: "old-token",
      userId: id,
      expiresAt: new Date(Date.now() + 60000),
    });
    await assert.rejects(() =>
      provisionAdmin(d, {
        email: "owner@example.com",
        password: "NewOwnerPassword42",
      }),
    );
    const repaired = await provisionAdmin(d, {
      email: "owner@example.com",
      password: "NewOwnerPassword42",
      repair: true,
    });
    assert.equal(repaired.id, id);
    const [owner] = await d
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id));
    assert.equal(owner.role, "admin");
    assert.equal(owner.active, true);
    assert.equal(owner.emailVerified, true);
    assert.equal((await d.select().from(schema.user)).length, 1);
    assert.equal((await d.select().from(schema.session)).length, 0);
    const accounts = await d.select().from(schema.account);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].accountId, id);
    const auth = createAuthentication(d);
    const post = (
      path: string,
      body: unknown,
      origin = "https://mct.example",
      cookie = "",
    ) =>
      forwardAuthRequest(
        new Request("https://mct.example/api/auth/" + path, {
          method: "POST",
          headers: { "content-type": "application/json", origin, cookie },
          body: JSON.stringify(body),
        }),
        (r) => auth.handler(r),
      );
    const invalid = await post("sign-in/email", {
      email: "owner@example.com",
      password: "WrongPassword42",
    });
    assert.equal(invalid.status, 401);
    const badOrigin = await post(
      "sign-in/email",
      { email: "owner@example.com", password: "NewOwnerPassword42" },
      "https://other.example",
    );
    assert.equal(badOrigin.status, 403);
    const login = await post("sign-in/email", {
      email: "owner@example.com",
      password: "NewOwnerPassword42",
      rememberMe: true,
    });
    assert.equal(login.status, 200, await login.clone().text());
    const setCookies = login.headers.getSetCookie();
    assert.ok(
      setCookies.some((x) => x.includes("HttpOnly") && x.includes("Secure")),
    );
    const cookie = setCookies.map((x) => x.split(";")[0]).join("; ");
    const session = await forwardAuthRequest(
      new Request("https://mct.example/api/auth/get-session", {
        headers: { cookie },
      }),
      (r) => auth.handler(r),
    );
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.id, id);
    const signUp = await post("sign-up/email", {
      email: "visitor@example.com",
      name: "Visitor",
      password: "VisitorPassword42",
    });
    assert.notEqual(signUp.status, 200);
    const out = await post(
      "sign-out",
      undefined,
      "https://mct.example",
      cookie,
    );
    assert.equal(out.status, 200);
    const signedOut = await forwardAuthRequest(
      new Request("https://mct.example/api/auth/get-session", {
        headers: { cookie },
      }),
      (r) => auth.handler(r),
    );
    assert.equal(await signedOut.json(), null);
    const failed = await forwardAuthRequest(
      new Request("https://mct.example/api/auth/get-session"),
      async () => {
        throw new TypeError("internal test failure");
      },
    );
    assert.equal(failed.status, 503);
    assert.equal((await failed.json()).code, "AUTH_SERVICE_UNAVAILABLE");
  } finally {
    await pg.close();
  }
});
test("Theme startup: remembered selection, system preference and blocked storage", () => {
  for (const [stored, system, expected] of [
    ["dark", false, "dark"],
    ["light", true, "light"],
    [null, true, "dark"],
    ["invalid", false, "light"],
  ] as const) {
    const document = {
      documentElement: { dataset: {} as Record<string, string> },
    };
    runInNewContext(themeInit, {
      document,
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: system }),
    });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
  const document = {
    documentElement: { dataset: {} as Record<string, string> },
  };
  runInNewContext(themeInit, {
    document,
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
    },
  });
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.equal(validTheme("dark"), true);
  assert.equal(validTheme("unknown"), false);
});
