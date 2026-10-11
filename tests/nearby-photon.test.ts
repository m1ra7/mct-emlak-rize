import { test } from "node:test";
import assert from "node:assert/strict";
import { photonNearby } from "../lib/nearby-photon";
import { isAgencyOwner } from "../lib/agency";
test("Alternatif çevre servisi gerçek OSM noktalarını dönüştürür, uzak/tekrar kayıtları eler ve kategori arızasını yalıtır", async () => {
  let calls = 0;
  const result = await photonNearby(41, 40, {
    endpoint: "https://example.test/reverse",
    fetcher: async (url) => {
      const u = new URL(String(url));
      assert.equal(u.searchParams.get("radius"), "5");
      assert.ok(u.searchParams.getAll("osm_tag").length);
      if (++calls === 1) return new Response("offline", { status: 503 });
      return Response.json({
        features: [
          {
            geometry: { type: "Point", coordinates: [40.001, 41.001] },
            properties: {
              osm_type: "N",
              osm_id: 1,
              osm_key: "amenity",
              osm_value: "school",
              name: "Okul",
            },
          },
          {
            geometry: { type: "Point", coordinates: [42, 43] },
            properties: {
              osm_type: "N",
              osm_id: 2,
              osm_key: "amenity",
              osm_value: "school",
              name: "Uzak",
            },
          },
          {
            geometry: { type: "Point", coordinates: ["40", 41] },
            properties: {
              osm_type: "N",
              osm_id: 3,
              osm_key: "amenity",
              osm_value: "school",
            },
          },
        ],
      });
    },
  });
  assert.equal(calls, 8);
  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].id, "node/1");
  assert.equal(result.places[0].category, "Eğitim");
  assert.equal(result.limitedCoverage, true);
  await assert.rejects(
    () =>
      photonNearby(41, 40, {
        endpoint: "https://example.test",
        fetcher: async () => Response.json({ error: "bad" }),
      }),
    /yanıt vermiyor/,
  );
});
test("İlan yönetimi yalnız etkin işletme yöneticisine açıktır", () => {
  const old = process.env.ADMIN_EMAIL;
  try {
    process.env.ADMIN_EMAIL = "owner@example.test";
    assert.equal(
      isAgencyOwner({
        email: "owner@example.test",
        role: "admin",
        active: true,
      }),
      true,
    );
    assert.equal(
      isAgencyOwner({
        email: "owner@example.test",
        role: "user",
        active: true,
      }),
      false,
    );
    assert.equal(
      isAgencyOwner({
        email: "other@example.test",
        role: "admin",
        active: true,
      }),
      false,
    );
    assert.equal(
      isAgencyOwner({
        email: "owner@example.test",
        role: "admin",
        active: false,
      }),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = old;
  }
});
