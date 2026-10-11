import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressParts,
  addressQuery,
  automaticPlace,
  matchingPlaces,
  geocodingResults,
  type AddressContext,
} from "../lib/geocoding";
import { geocodeRequest } from "../lib/geocoding-provider";
import { listingMap } from "../lib/listing-map";
const context: AddressContext = {
  address: "Çarşı Mahallesi / Atatürk Caddesi No: 12",
  city: "Rize",
  district: "Rize Merkez",
  neighborhood: "Çarşı",
};
const row = (address: Record<string, string>, extra = {}) => ({
  lat: "41.0247",
  lon: "40.5185",
  place_rank: 30,
  display_name: "Atatürk Caddesi, Çarşı Mahallesi, Rize Merkez, Rize, Türkiye",
  address: {
    state: "Rize",
    county: "Rize Merkez",
    suburb: "Çarşı Mahallesi",
    road: "Atatürk Caddesi",
    house_number: "12",
    country_code: "tr",
    ...address,
  },
  ...extra,
});
test("Adres kontrolü 1/5: doğru bina, mahalle ve numara aynı koordinatla haritaya geçer", async () => {
  const query = addressQuery(
    context.address,
    context.district,
    context.city,
    context.neighborhood,
  );
  const calls: URL[] = [];
  const places = await geocodeRequest(query, {
    endpoint: "https://example.test/search",
    agent: "Test",
    context,
    throttle: async () => {},
    fetcher: async (url) => {
      const u = new URL(String(url));
      calls.push(u);
      assert.equal(u.searchParams.get("addressdetails"), "1");
      assert.equal(u.searchParams.get("layer"), "address");
      return Response.json([row({})]);
    },
  });
  const point = automaticPlace(places, context.address, context)!;
  assert.equal(calls.length, 1);
  assert.equal(point.latitude, "41.0247");
  const map = listingMap({
    ...context,
    latitude: point.latitude,
    longitude: point.longitude,
  });
  assert.equal(
    new URL(map.embed, "http://localhost").searchParams.get("marker"),
    "41.0247,40.5185",
  );
});
test("Adres kontrolü 2/5: aynı sokak adı başka ilde ise tek bina sonucu bile seçilmez", () => {
  const places = geocodingResults([
    row({ state: "Trabzon", county: "Ortahisar" }),
  ]);
  assert.deepEqual(matchingPlaces(places, context), []);
  assert.equal(automaticPlace(places, context.address, context), undefined);
});
test("Adres kontrolü 3/5: başka ilçe veya mahalledeki sonuç kesin adres sayılmaz", () => {
  for (const address of [
    { county: "Çayeli" },
    { suburb: "Fener Mahallesi" },
  ] as Record<string, string>[]) {
    const places = geocodingResults([row(address)]);
    assert.deepEqual(matchingPlaces(places, context), []);
    assert.equal(automaticPlace(places, context.address, context), undefined);
  }
  const conflicted = geocodingResults([
    row(
      { county: "Güneysu" },
      {
        display_name: "Atatürk Caddesi, Çarşı Mahallesi, Çayeli, Rize, Türkiye",
      },
    ),
  ]);
  assert.deepEqual(
    matchingPlaces(conflicted, { ...context, district: "Çayeli" }),
    [],
  );
});
test("Adres kontrolü 4/5: eksik bina numarası, yanlış numara ve POI rütbesi sokak merkezini kesin pin yapmaz", () => {
  for (const item of [
    row({ house_number: "" }, { place_rank: 26 }),
    row({ house_number: "14" }),
    row({ house_number: "" }, { place_rank: 30, category: "amenity" }),
  ]) {
    assert.equal(
      automaticPlace(geocodingResults([item]), context.address, context),
      undefined,
    );
  }
  assert.equal(
    automaticPlace(
      geocodingResults([row({})]),
      "Çarşı Mahallesi / Atatürk Caddesi",
      { ...context, address: "Çarşı Mahallesi / Atatürk Caddesi" },
    ),
    undefined,
  );
  assert.equal(addressParts("15. Sokak No: 12/3").houseNumber, "12/3");
  assert.equal(
    addressParts("Fatih Sultan Mehmet Mahallesi / Barış Cad. No: 14")
      .neighborhood,
    "Fatih Sultan Mehmet",
  );
});
test("Adres kontrolü 5/5: belirsiz sonuç otomatik seçilmez; yapılandırılmış ikinci sorgu gerçek bina bulabilir", async () => {
  const places = geocodingResults([row({}), row({}, { lon: "40.5189" })]);
  assert.equal(automaticPlace(places, context.address, context), undefined);
  const calls: URL[] = [];
  const result = await geocodeRequest(
    addressQuery(context.address, context.district, context.city),
    {
      endpoint: "https://example.test/search",
      agent: "Test",
      context,
      throttle: async () => {},
      fetcher: async (url) => {
        const u = new URL(String(url));
        calls.push(u);
        if (calls.length === 1)
          return Response.json([row({ house_number: "" }, { place_rank: 26 })]);
        assert.equal(u.searchParams.has("q"), false);
        assert.equal(u.searchParams.get("street"), "12 Atatürk Caddesi");
        assert.equal(u.searchParams.get("state"), "Rize");
        return Response.json([row({})]);
      },
    },
  );
  assert.equal(calls.length, 2);
  assert.equal(automaticPlace(result, context.address, context)?.precise, true);
});

test("Yedek adres servisi: GeoJSON eksen sırası ve aynı il/mahalle/bina doğrulaması", async () => {
  const { photonRequest } = await import("../lib/photon-provider");
  const places = await photonRequest("Rize adres", {
    endpoint: "https://backup.test/api",
    agent: "Test",
    context,
    throttle: async () => {},
    fetcher: async (url) => {
      assert.equal(new URL(String(url)).searchParams.get("countrycode"), "TR");
      return Response.json({
        features: [
          {
            geometry: { type: "Point", coordinates: [40.5185, 41.0247] },
            properties: {
              name: "Adres",
              housenumber: "12",
              street: "Atatürk Caddesi",
              state: "Rize",
              county: "Rize Merkez",
              district: "Çarşı Mahallesi",
              countrycode: "TR",
            },
          },
          {
            geometry: { type: "Point", coordinates: [40.51, 41.02] },
            properties: {
              name: "Başka il",
              housenumber: "12",
              street: "Atatürk Caddesi",
              state: "Trabzon",
              countrycode: "TR",
            },
          },
          {
            geometry: { type: "Point", coordinates: ["bad", 41] },
            properties: { name: "Hatalı" },
          },
        ],
      });
    },
  });
  assert.equal(places.length, 1);
  assert.equal(
    automaticPlace(places, context.address, context)?.latitude,
    "41.0247",
  );
  await assert.rejects(
    () =>
      photonRequest("Test", {
        endpoint: "https://backup.test/api",
        agent: "Test",
        throttle: async () => {},
        fetcher: async () => Response.json({ invalid: true }),
      }),
    /geçersiz yanıt/,
  );
});
