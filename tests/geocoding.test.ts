import { test } from "node:test";
import assert from "node:assert/strict";
import { geocodingResults } from "../lib/geocoding";
import { listingMap } from "../lib/listing-map";
import { listingInput } from "../lib/validation";
test("Adres sonuçları doğrulanır, seçilen koordinat işaretçiye dönüşür", () => {
  assert.deepEqual(geocodingResults({}), []);
  assert.deepEqual(
    geocodingResults([
      { lat: "NaN", lon: "40", display_name: "Hatalı" },
      { lat: "100", lon: "40", display_name: "Hatalı" },
      { lat: null, lon: "40", display_name: "Hatalı" },
    ]),
    [],
  );
  const places = geocodingResults([
    {
      lat: "41.0255",
      lon: "40.5177",
      place_rank: 30,
      display_name: "Test adres",
    },
  ]);
  assert.equal(places.length, 1);
  assert.equal(places[0].precise, true);
  const map = listingMap({
    address: places[0].name,
    city: "Rize",
    district: "Merkez",
    latitude: places[0].latitude,
    longitude: places[0].longitude,
  });
  assert.equal(map.approximate, false);
  assert.equal(
    new URL(map.embed, "http://localhost").searchParams.get("marker"),
    "41.0255,40.5177",
  );
  const latitude = listingInput.shape.latitude.parse(places[0].latitude);
  assert.equal(latitude, 41.0255);
});

test("Otomatik adres: bina, sokak, belirsiz sonuç ve şehir merkezi", async () => {
  const { automaticPlace, addressQuery } = await import("../lib/geocoding");
  const result = (rank: number, name: string) =>
    geocodingResults([
      { lat: "41.02", lon: "40.51", place_rank: rank, display_name: name },
    ])[0];
  const building = result(30, "Bina"),
    street = result(26, "Sokak"),
    city = result(16, "Rize");
  assert.equal(automaticPlace([building, street]), building);
  assert.equal(automaticPlace([street, city]), street);
  assert.equal(automaticPlace([city]), undefined);
  assert.equal(automaticPlace([street, result(26, "Başka sokak")]), undefined);
  assert.equal(
    addressQuery("Çarşı / Atatürk Caddesi No: 12", "Rize Merkez", "Rize"),
    "Çarşı, Atatürk Caddesi 12, Rize, Türkiye",
  );
});

test("Bina/mahalle bulunamazsa sokak sorgusu ve mahalleye göre belirsiz sonucu çözme", async () => {
  const { streetAddressQuery, automaticPlace } =
    await import("../lib/geocoding");
  assert.equal(
    streetAddressQuery("Çarşı Mahallesi, Atatürk Caddesi 12, Rize, Türkiye"),
    "Atatürk Caddesi, Rize, Türkiye",
  );
  const places = geocodingResults([
    {
      lat: "41.0388",
      lon: "40.5032",
      display_name: "Atatürk Caddesi, Camiönü Mahallesi, Rize",
      place_rank: 26,
    },
    {
      lat: "41.0247",
      lon: "40.5185",
      display_name: "Atatürk Caddesi, Çarşı Mahallesi, Rize",
      place_rank: 26,
    },
  ]);
  assert.equal(
    automaticPlace(places, "Çarşı Mahallesi Atatürk Caddesi 12"),
    places[1],
  );
  assert.equal(
    automaticPlace(places, "Başka Mahallesi Atatürk Caddesi"),
    undefined,
  );
});

test("Tam adres içinde il/ilçe tekrarları temizlenir", async () => {
  const { addressQuery } = await import("../lib/geocoding");
  assert.equal(
    addressQuery(
      "Rize / Merkez / Çarşı Mahallesi / Atatürk Caddesi No: 12",
      "Rize Merkez",
      "Rize",
    ),
    "Çarşı Mahallesi, Atatürk Caddesi 12, Rize, Türkiye",
  );
});

test("Adres servisi: gerçek istek biçimi, boş tam adresin sokak araması ve servis hatası", async () => {
  const { geocodeRequest } = await import("../lib/geocoding-provider");
  const queries: string[] = [];
  let calls = 0;
  const options = {
    endpoint: "https://example.test/search",
    agent: "MCT-Test",
    throttle: async () => {
      calls++;
    },
    fetcher: (async (url) => {
      const u = new URL(String(url));
      queries.push(u.searchParams.get("q")!);
      assert.equal(u.searchParams.get("countrycodes"), "tr");
      return Response.json(
        queries.length === 1
          ? []
          : [
              {
                lat: "41.02",
                lon: "40.51",
                place_rank: 26,
                display_name: "Atatürk Caddesi, Çarşı Mahallesi, Rize",
              },
            ],
      );
    }) as typeof fetch,
  };
  const results = await geocodeRequest(
    "Çarşı Mahallesi, Atatürk Caddesi 12, Rize, Türkiye",
    options,
  );
  assert.equal(calls, 2);
  assert.equal(results.length, 1);
  assert.equal(results[0].street, true);
  assert.equal(queries[1], "Atatürk Caddesi, Rize, Türkiye");
  await assert.rejects(
    () =>
      geocodeRequest("Test adres", {
        ...options,
        fetcher: async () => new Response("", { status: 503 }),
      }),
    /Adres arama servisine/,
  );
  await assert.rejects(
    () =>
      geocodeRequest("Test adres", {
        ...options,
        fetcher: async () => Response.json({ error: "invalid" }),
      }),
    /geçersiz yanıt/,
  );
});
