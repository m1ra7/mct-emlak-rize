import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.env.SMOKE_PRODUCTION === "true" ? "start" : "dev",
    "--port",
    "3107",
    "--hostname",
    "127.0.0.1",
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: "",
      BETTER_AUTH_SECRET: "",
      BETTER_AUTH_URL: "http://127.0.0.1:3107",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (b) => (logs += b));
child.stderr.on("data", (b) => (logs += b));
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try {
      const r = await fetch("http://127.0.0.1:3107/");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error("HTTP server unavailable: " + logs);
  for (const [path, expected] of [
    ["/auth/giris", 307],
    ["/auth/kayit", 307],
    ["/robots.txt", 200],
    ["/iletisim", 200],
    ["/favoriler", 200],
    ["/yonetim/giris", 200],
    ["/api/listings", 500],
    ["/admin", 307],
    ["/profil", 307],
  ]) {
    const r = await fetch("http://127.0.0.1:3107" + path, {
      redirect: "manual",
    });
    if (r.status !== expected)
      throw new Error(`${path}: ${r.status}, expected ${expected}`);
    console.log(path, r.status);
  }
  const picker = await fetch("http://127.0.0.1:3107/map-picker.html");
  if (!picker.ok || picker.headers.get("x-frame-options") !== "SAMEORIGIN")
    throw new Error("Map picker must permit same-origin framing");
  if (
    !picker.headers
      .get("content-security-policy")
      ?.includes("frame-ancestors 'self'")
  )
    throw new Error("Map picker framing must remain same-origin only");
  const pickerHtml = await picker.text();
  if (pickerHtml.includes("unpkg.com"))
    throw new Error("Map picker still depends on CDN");
  for (const path of [
    "/vector-map.js",
    "/map-picker.css",
    "/vendor/maplibre-6.13.0/maplibre-gl.mjs",
    "/vendor/maplibre-6.13.0/maplibre-gl-worker.mjs",
    "/vendor/maplibre-6.13.0/maplibre-gl.css",
  ]) {
    const asset = await fetch("http://127.0.0.1:3107" + path);
    if (!asset.ok) throw new Error("Missing map asset: " + path);
    if (
      path.startsWith("/vendor/") &&
      !asset.headers.get("cache-control")?.includes("immutable")
    )
      throw new Error("Versioned map assets are not cached");
  }
  const login = await fetch("http://127.0.0.1:3107/yonetim/giris");
  if (login.headers.get("x-frame-options") !== "DENY")
    throw new Error("Login framing protection weakened");
  console.log(
    "Map picker HTTP 200, SAMEORIGIN/CSP, local assets/cache and login DENY verified.",
  );
  const home = await (await fetch("http://127.0.0.1:3107/")).text();
  if (
    home.includes('href="/auth/') ||
    home.includes('href="/profil/') ||
    home.includes('href="/yonetim/')
  )
    throw new Error("Visitor navigation exposes account links");
  if (!home.includes("Yaşamınıza") || !home.includes("coastal-residence.webp"))
    throw new Error("Modern hero missing");
  const asset = await fetch(
    "http://127.0.0.1:3107/images/coastal-residence.webp",
  );
  if (!asset.ok) throw new Error("Hero asset missing");
  const deleteLocationUrl =
    "http://127.0.0.1:3107/api/manage/locations/city/00000000-0000-4000-8000-000000000001";
  const anonymousDelete = await fetch(deleteLocationUrl, {
    method: "DELETE",
    headers: { origin: "http://127.0.0.1:3107" },
  });
  if (anonymousDelete.status !== 401)
    throw new Error("Anonymous location deletion was not rejected");
  const foreignDelete = await fetch(deleteLocationUrl, {
    method: "DELETE",
    headers: { origin: "https://other.example" },
  });
  if (foreignDelete.status !== 403)
    throw new Error("Cross-origin location deletion was not rejected");
  console.log("Location deletion rejects anonymous and cross-origin requests.");
  const publicationUrl =
    "http://127.0.0.1:3107/api/manage/listings/00000000-0000-4000-8000-000000000001/status";
  const noSession = await fetch(publicationUrl, {
    method: "PATCH",
    headers: {
      origin: "http://127.0.0.1:3107",
      "content-type": "application/json",
    },
    body: JSON.stringify({ status: "published" }),
  });
  if (noSession.status !== 401)
    throw new Error("Anonymous publishing was not rejected");
  const badOrigin = await fetch(publicationUrl, {
    method: "PATCH",
    headers: {
      origin: "https://other.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ status: "published" }),
  });
  if (badOrigin.status !== 403)
    throw new Error("Cross-origin publishing was not rejected");
  const failedLogin = await fetch(
    "http://127.0.0.1:3107/api/auth/sign-in/email",
    {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3107",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "NotARealPassword42",
      }),
    },
  );
  if (failedLogin.status !== 503 || !(await failedLogin.json()).code)
    throw new Error("Unconfigured auth did not return an actionable error");
  if (!home.includes("mct-theme-init") || !home.includes("Koyu temaya geç"))
    throw new Error("Theme option missing");
  for (const path of [
    "/fonts/manrope-latin.woff2",
    "/fonts/manrope-latin-ext.woff2",
  ])
    if (!(await fetch("http://127.0.0.1:3107" + path)).ok)
      throw new Error("Local typography asset missing");
  const saved = await fetch("http://127.0.0.1:3107/api/saved?ids=");
  if (!saved.ok) throw new Error("Empty saved-list API failed");
  console.log(
    "Modern homepage, assets, guest navigation and empty saved-list API verified.",
  );
  console.log("HTTP smoke checks passed (no external credentials).");
} finally {
  child.kill("SIGTERM");
}
