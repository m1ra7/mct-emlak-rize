import { test } from "node:test";
import assert from "node:assert/strict";
import { listingMap } from "../lib/listing-map";
test("Adres haritası: koordinat yoksa adres araması; sıfır dahil geçerli koordinat önceliği", () => {
  const address = {
    address: "Atatürk Cad. No: 12 & Daire 3",
    district: "Merkez",
    city: "Rize",
    latitude: null,
    longitude: null,
  };
  const map = listingMap(address);
  assert.equal(map.approximate, true);
  assert.equal(
    new URL(map.embed, "http://localhost").searchParams.get("q"),
    "Atatürk Cad. No: 12 & Daire 3, Merkez, Rize, Türkiye",
  );
  assert.equal(
    new URL(map.link).searchParams.get("query"),
    new URL(map.embed, "http://localhost").searchParams.get("q"),
  );
  const coordinates = listingMap({ ...address, latitude: "0", longitude: "0" });
  assert.equal(coordinates.approximate, false);
  assert.equal(new URL(coordinates.embed, "http://localhost").searchParams.get("marker"), "0,0");
  assert.equal(
    listingMap({ ...address, latitude: "100", longitude: "40" }).approximate,
    true,
  );
});
