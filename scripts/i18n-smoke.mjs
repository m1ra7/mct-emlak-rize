import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
const base = "http://127.0.0.1:3128";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3128",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
server.stdout.on("data", (x) => (output += x));
server.stderr.on("data", (x) => (output += x));
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(500);
  }
  assert.ok(ready, output);
  for (const [locale, title, contact, saved] of [
    ["tr", "Hayalinizdeki yer,", "İletişim", "Gözünüzün kaldığı yerler."],
    ["en", "Your dream property,", "Contact", "Properties you love."],
    [
      "de",
      "Ihre Wunschimmobilie,",
      "Kontakt",
      "Immobilien, die Ihnen gefallen.",
    ],
  ]) {
    const change = await fetch(base + "/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    assert.equal(change.status, 200);
    const cookie = change.headers.get("set-cookie").split(";")[0];
    const html = await (
      await fetch(base + "/?view=list", { headers: { cookie } })
    ).text();
    assert.ok(html.includes(`lang="${locale}"`));
    const visible = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ");
    assert.ok(visible.includes(title), `${locale}: homepage title`);
    assert.ok(html.indexOf("footer-languages") > html.indexOf("footer-bottom"));
    assert.match(
      html,
      new RegExp(
        `value="${locale}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*value="${locale}"`,
      ),
    );
    const contactHtml = await (
      await fetch(base + "/iletisim", { headers: { cookie } })
    ).text();
    assert.ok(
      contactHtml.includes(`>${contact}</h1>`),
      `${locale}: contact heading`,
    );
    const savedHtml = await (
      await fetch(base + "/favoriler", { headers: { cookie } })
    ).text();
    assert.ok(savedHtml.includes(saved), `${locale}: saved properties heading`);
    console.log(`${locale}: cookie → homepage → contact → saved properties OK`);
  }
  const invalid = await fetch(base + "/api/locale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"locale":"fr"}',
  });
  assert.equal(invalid.status, 400);
  const native = await fetch(base + "/api/locale", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: base + "/ilanlar?view=list&sort=priceAsc",
    },
    body: "locale=de",
    redirect: "manual",
  });
  assert.equal(native.status, 303);
  assert.equal(
    native.headers.get("location"),
    base + "/ilanlar?view=list&sort=priceAsc",
  );
  console.log("Native form redirect and unsupported-language rejection OK");
} finally {
  server.kill("SIGTERM");
}
