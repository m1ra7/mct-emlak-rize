import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceMeters, parseNearby } from "../lib/nearby";
import { isLandType } from "../lib/property-kind";
test("Yakın çevre: koordinat, gerçek mesafe, sınıflandırma ve tekrarları eleme", () => {
  assert.equal(distanceMeters(41, 40, 41, 40), 0);
  assert.ok(Math.abs(distanceMeters(0, 0, 0, 0.001) - 111) <= 1);
  const elements = [
    {
      type: "node",
      id: 1,
      lat: 41,
      lon: 40,
      tags: { name: "Okul", amenity: "school" },
    },
    {
      type: "way",
      id: 2,
      center: { lat: 41, lon: 40 },
      tags: { name: "Okul", amenity: "school" },
    },
    {
      type: "node",
      id: 3,
      lat: 41.001,
      lon: 40,
      tags: { name: "Salon", amenity: "community_centre" },
    },
    {
      type: "node",
      id: 4,
      lat: 42,
      lon: 40,
      tags: { name: "Uzak", amenity: "school" },
    },
    {
      type: "node",
      id: 5,
      lat: NaN,
      lon: 40,
      tags: { name: "Hatalı", amenity: "school" },
    },
  ];
  const places = parseNearby({ elements }, 41, 40);
  assert.equal(places.length, 2);
  assert.equal(places[0].category, "Eğitim");
  assert.equal(places[1].category, "Kültür & Sanat");
  assert.equal(places[1].distance, 111);
  assert.equal(places[0].driveMinutes, undefined);
  assert.equal(isLandType({ slug: "arsa" }), true);
  assert.equal(isLandType({ name: "Tarla" }), true);
  assert.equal(isLandType({ name: "Daire" }), false);
});

test("Rota matrisi: yaya ve araç ayrımı, null rota ve geçersiz ölçümler", async () => {
  const { applyRouteMatrix, addRoutes } = await import("../lib/nearby-routing");
  const points = [0, 1, 2].map((i) => ({
    id: String(i),
    name: "Test",
    category: "Eğitim",
    lat: 41,
    lon: 40,
    distance: 100,
  }));
  applyRouteMatrix(
    points,
    { durations: [[121, null, -1]], distances: [[245, null, 200]] },
    "walk",
  );
  assert.equal(
    (points[0] as import("../lib/nearby").NearbyPlace).walkMinutes,
    3,
  );
  assert.equal(
    (points[0] as import("../lib/nearby").NearbyPlace).driveMinutes,
    undefined,
  );
  assert.equal(
    (points[1] as import("../lib/nearby").NearbyPlace).walkMinutes,
    undefined,
  );
  assert.equal(
    (points[2] as import("../lib/nearby").NearbyPlace).walkMinutes,
    undefined,
  );
  const original = globalThis.fetch;
  const key = process.env.ORS_API_KEY,
    foot = process.env.OSRM_FOOT_URL;
  try {
    process.env.ORS_API_KEY = "test-server-key";
    const urls: string[] = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "test-server-key",
      );
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.sources, ["0"]);
      assert.deepEqual(body.destinations, ["1", "2", "3"]);
      return Response.json({
        durations: [[180, 240, null]],
        distances: [[300, 400, null]],
      });
    };
    await addRoutes(points, 41, 40);
    assert.ok(urls.some((x) => x.endsWith("/foot-walking")));
    assert.ok(urls.some((x) => x.endsWith("/driving-car")));
    assert.equal(
      (points[1] as import("../lib/nearby").NearbyPlace).walkDistance,
      400,
    );
    delete process.env.ORS_API_KEY;
    delete process.env.OSRM_FOOT_URL;
    urls.length = 0;
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return Response.json({ code: "NoRoute" });
    };
    await addRoutes(points, 41, 40);
    assert.equal(urls.length, 1);
    assert.ok(urls[0].includes("/driving/"));
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.ORS_API_KEY;
    else process.env.ORS_API_KEY = key;
    if (foot === undefined) delete process.env.OSRM_FOOT_URL;
    else process.env.OSRM_FOOT_URL = foot;
  }
});

test("Yakın çevre: isimsiz gerçek duraklar, marka kayıtları ve 10'dan fazla yer kaybolmaz", () => {
  const elements = Array.from({ length: 25 }, (_, i) => ({
    type: "node",
    id: i,
    lat: 41 + i * 0.0001,
    lon: 40,
    tags: { name: `Okul ${i}`, amenity: "school" },
  }));
  const more = [
    {
      type: "node",
      id: 100,
      lat: 41,
      lon: 40.0002,
      tags: { highway: "bus_stop" },
    },
    {
      type: "node",
      id: 101,
      lat: 41,
      lon: 40.0003,
      tags: { highway: "bus_stop" },
    },
    {
      type: "node",
      id: 102,
      lat: 41,
      lon: 40.0004,
      tags: { brand: "Gerçek marka", shop: "convenience" },
    },
  ];
  const places = parseNearby({ elements: [...elements, ...more] }, 41, 40);
  assert.equal(places.filter((p) => p.category === "Eğitim").length, 25);
  assert.equal(places.filter((p) => p.category === "Ulaşım").length, 2);
  assert.equal(
    places.find((p) => p.category === "Market")?.name,
    "Gerçek marka",
  );
});
test("Yakın çevre: HTTP hatası, eksik HTTP 200 ve geçersiz yanıt ikinci serviste düzelir", async () => {
  const { nearbyRequest, nearbyQuery } = await import("../lib/nearby-provider");
  assert.throws(() => nearbyQuery(NaN, 40), /Geçersiz/);
  for (const bad of [
    new Response("", { status: 503 }),
    Response.json({ remark: "runtime error: timeout", elements: [] }),
    Response.json({ unexpected: true }),
  ]) {
    let calls = 0;
    const snapshot = await nearbyRequest(41, 40, {
      endpoints: ["https://primary.test", "https://backup.test"],
      fetcher: async (_url, init) => {
        calls++;
        assert.ok(String(init?.body).includes("around%3A5000"));
        return calls === 1
          ? bad
          : Response.json({
              elements: [
                {
                  type: "node",
                  id: 1,
                  lat: 41,
                  lon: 40,
                  tags: { name: "Gerçek veri", amenity: "school" },
                },
              ],
            });
      },
    });
    assert.equal(calls, 2);
    assert.equal(snapshot.places[0].name, "Gerçek veri");
    assert.ok(snapshot.fetchedAt);
  }
  await assert.rejects(
    () =>
      nearbyRequest(41, 40, {
        endpoints: ["https://error.test"],
        fetcher: async () => {
          throw new Error("network error");
        },
      }),
    /servisleri şu anda/,
  );
});

test("Kısmi gerçek çevre verisi yedek servis de çalışmadığında kaybolmaz", async () => {
  const { nearbyRequest } = await import("../lib/nearby-provider");
  let calls = 0;
  const result = await nearbyRequest(41, 40, {
    endpoints: ["https://partial.test", "https://offline.test"],
    fetcher: async () => {
      if (++calls > 1) throw new Error("timeout");
      return Response.json({
        remark: "runtime timeout",
        elements: [
          {
            type: "node",
            id: 1,
            lat: 41,
            lon: 40,
            tags: { amenity: "school", name: "Okul" },
          },
        ],
      });
    },
  });
  assert.equal(result.partial, true);
  assert.equal(result.places[0].name, "Okul");
  assert.equal(calls, 2);
});
