import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressParts,
  addressQuery,
  automaticPlace,
  geocodingResults,
} from "../lib/geocoding";
import { listingMap } from "../lib/listing-map";
import { nearbyVisible } from "../lib/nearby";
import { nearbyRequest } from "../lib/nearby-provider";
import { addRoutes } from "../lib/nearby-routing";

test("Yeni kontrol 1/5: 12/3 bina numarası adres sorgusunda bölünmez", () => {
  const address = "Rize / Merkez / Çarşı Mahallesi / Atatürk Caddesi No: 12/3";
  assert.equal(addressParts(address).houseNumber, "12/3");
  assert.equal(
    addressQuery(address, "Merkez", "Rize"),
    "Çarşı Mahallesi, Atatürk Caddesi 12/3, Rize, Türkiye",
  );
});
test("Yeni kontrol 2/5: boş koordinat sıfır-sıfır konumuna dönüşmez", () => {
  assert.equal(
    listingMap({
      address: "Çarşı",
      city: "Rize",
      district: "Merkez",
      latitude: "",
      longitude: " ",
    }).approximate,
    true,
  );
  const street = geocodingResults([
    { lat: "41", lon: "40", display_name: "Atatürk Caddesi", place_rank: 26 },
  ]);
  assert.equal(automaticPlace(street, "Atatürk Caddesi"), undefined);
});
test("Yeni kontrol 3/5: Tümü sekmesi üç sonuçta kesilmez ve devamı açılır", () => {
  const places = Array.from({ length: 40 }, (_, i) => ({
    id: `node/${i}`,
    name: `Yer ${i}`,
    category: "Eğitim",
    lat: 41,
    lon: 40,
    distance: i,
  }));
  assert.equal(nearbyVisible(places, "Tümü", 12).length, 12);
  assert.equal(nearbyVisible(places, "Tümü", 36).length, 36);
  assert.equal(nearbyVisible(places, "Eğitim", 36).length, 36);
});
test("Yeni kontrol 4/5: çevre servisi 30 üzerindeki yerleri korur, sınırı bildirir", async () => {
  const result = await nearbyRequest(41, 40, {
    endpoints: ["https://test.invalid"],
    fetcher: async () =>
      Response.json({
        elements: Array.from({ length: 100 }, (_, i) => ({
          type: "node",
          id: i,
          lat: 41 + i * 0.00001,
          lon: 40,
          tags: { name: `Okul ${i}`, amenity: "school" },
        })),
      }),
  });
  assert.equal(result.places.length, 90);
  assert.deepEqual(result.limitedCategories, ["Eğitim"]);
  assert.ok(result.places[0].distance <= result.places[89].distance);
});
test("Yeni kontrol 5/5: çok sayıda yerin rotası küçük matrislerle tamamlanır", async () => {
  const original = globalThis.fetch;
  const ors = process.env.ORS_API_KEY;
  const foot = process.env.OSRM_FOOT_URL;
  const places = Array.from({ length: 90 }, (_, i) => ({
    id: `node/${i}`,
    name: `Yer ${i}`,
    category: "Eğitim",
    lat: 41,
    lon: 40,
    distance: i,
    driveMinutes: undefined as number | undefined,
  }));
  let calls = 0;
  try {
    delete process.env.ORS_API_KEY;
    delete process.env.OSRM_FOOT_URL;
    globalThis.fetch = async (url) => {
      calls++;
      const count = new URL(String(url)).searchParams
        .get("destinations")!
        .split(";").length;
      assert.ok(count <= 24);
      return Response.json({
        code: "Ok",
        durations: [Array(count).fill(120)],
        distances: [Array(count).fill(500)],
      });
    };
    await addRoutes(places, 41, 40);
    assert.equal(calls, 4);
    assert.ok(places.every((p) => p.driveMinutes === 2));
  } finally {
    globalThis.fetch = original;
    if (ors === undefined) delete process.env.ORS_API_KEY;
    else process.env.ORS_API_KEY = ors;
    if (foot === undefined) delete process.env.OSRM_FOOT_URL;
    else process.env.OSRM_FOOT_URL = foot;
  }
});

test("Canlı Photon yanıtı: Çarşı locality alanı Piriçelebi district alanından önce gelir; 297/C korunur", async () => {
  const { photonRequest } = await import("../lib/photon-provider");
  const context = {
    address: "Çarşı Mahallesi / Atatürk Caddesi No: 297/C",
    city: "Rize",
    district: "Merkez",
    neighborhood: "Çarşı",
  };
  assert.equal(addressParts(context.address).houseNumber, "297/C");
  const query = addressQuery(context.address, context.district, context.city);
  assert.ok(query.includes("297/C"));
  const found = await photonRequest(query, {
    endpoint: "https://test.invalid/api",
    agent: "Test",
    context,
    throttle: async () => {},
    fetcher: async () =>
      Response.json({
        features: [
          {
            geometry: { type: "Point", coordinates: [40.5195562, 41.0246197] },
            properties: {
              housenumber: "297/C",
              street: "Atatürk Caddesi",
              locality: "Çarşı Mahallesi",
              district: "Piriçelebi",
              city: "Rize",
              state: "Rize",
              countrycode: "TR",
            },
          },
        ],
      }),
  });
  assert.equal(found.length, 1);
  assert.equal(
    automaticPlace(found, context.address, context)?.longitude,
    "40.5195562",
  );
});
