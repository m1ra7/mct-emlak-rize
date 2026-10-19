import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { translator, isLocale } from "../lib/i18n/shared";
import { listingText } from "../lib/listing-i18n";
import { money } from "../components/ui";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/locale/route";

test("English and German preserve variables and Turkish remains the default", () => {
  assert.equal(translator("en")("Satılık"), "For sale");
  assert.equal(translator("de")("Kiralık"), "Zur Miete");
  assert.equal(
    translator("de")("{count} aktif ilan", { count: 7 }),
    "7 aktive Angebote",
  );
  assert.equal(
    translator("en")("Sayfa {page} / {pages}", { page: 2, pages: 5 }),
    "Page 2 of 5",
  );
  assert.equal(translator("tr")("Satılık"), "Satılık");
  assert.equal(
    translator("de")("Rize / Merkez / Fener"),
    "Rize / Merkez / Fener",
  );
  assert.equal(
    translator("en")("{count} aktif ilan", { count: 1 }),
    "1 active listing",
  );
  assert.equal(
    translator("de")("{count} aktif ilan", { count: 1 }),
    "1 aktives Angebot",
  );
  assert.equal(
    translator("en")("{count} ilan bulundu", { count: 1 }),
    "1 property found",
  );
  assert.equal(isLocale("fr"), false);
});

test("Both dictionaries cover the same keys and preserve every interpolation parameter", () => {
  const en = JSON.parse(readFileSync("lib/i18n/en.json", "utf8")) as Record<
    string,
    string
  >;
  const de = JSON.parse(readFileSync("lib/i18n/de.json", "utf8")) as Record<
    string,
    string
  >;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  const variables = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
  for (const [key, value] of Object.entries(en)) {
    assert.ok(value.trim());
    assert.ok(de[key].trim());
    assert.deepEqual(variables(key), variables(value), key);
    assert.deepEqual(variables(key), variables(de[key]), key);
  }
});

test("Listing translations fall back field by field without inventing content", () => {
  const source = {
    title: "Rize merkezde daire",
    description: "Türkçe açıklama.",
  };
  const translations = {
    "i18n.en.title": "Apartment in Rize",
    "i18n.de.description": "Eine Wohnung in Rize.",
  };
  assert.equal(
    listingText(source, "en", translations).title,
    "Apartment in Rize",
  );
  assert.equal(
    listingText(source, "en", translations).description,
    source.description,
  );
  assert.equal(
    listingText(source, "en", translations).descriptionLanguage,
    "tr",
  );
  assert.equal(
    listingText(source, "de", translations).description,
    "Eine Wohnung in Rize.",
  );
  assert.equal(listingText(source, "tr", translations).title, source.title);
  assert.match(money("1250000", "TRY", "de-DE"), /1\.250\.000/);
  assert.match(money("1250000", "TRY", "en-GB"), /1,250,000/);
});

test("Language endpoint saves an allowlisted language, rejects invalid values and keeps redirects local", async () => {
  const request = (body: string) =>
    new NextRequest("https://mct.example/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  const en = await POST(request('{"locale":"en"}'));
  assert.equal(en.status, 200);
  assert.match(en.headers.get("set-cookie") || "", /mct-locale=en/);
  assert.match(en.headers.get("set-cookie") || "", /HttpOnly/);
  assert.equal((await POST(request('{"locale":"fr"}'))).status, 400);
  assert.equal((await POST(request("not json"))).status, 400);
  const form = await POST(
    new NextRequest("https://mct.example/api/locale", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://outside.example/steal",
      },
      body: "locale=de",
    }),
  );
  assert.equal(form.status, 303);
  assert.equal(form.headers.get("location"), "https://mct.example/");
  const localForm = await POST(
    new NextRequest("http://localhost:3128/api/locale", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3128",
        "content-type": "application/x-www-form-urlencoded",
        referer: "http://127.0.0.1:3128/ilanlar?view=list&sort=priceAsc",
      },
      body: "locale=de",
    }),
  );
  assert.equal(
    localForm.headers.get("location"),
    "http://127.0.0.1:3128/ilanlar?view=list&sort=priceAsc",
  );
});

test("Text language links work without JavaScript and reject unsupported locales", () => {
  const response = GET(
    new NextRequest("https://mct.example/api/locale?locale=de", {
      headers: { referer: "https://mct.example/ilanlar?view=list" },
    }),
  );
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://mct.example/ilanlar?view=list",
  );
  assert.match(response.headers.get("set-cookie") || "", /mct-locale=de/);
  assert.equal(
    GET(new NextRequest("https://mct.example/api/locale?locale=fr")).status,
    400,
  );
});
