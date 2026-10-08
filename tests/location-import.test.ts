import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import {
  importTurkeyLocations,
  turkeyLocationCounts,
} from "../lib/location-import";
test("Türkiye konumları: 81 il, 973 ilçe, mevcut kimlikleri koruma ve tekrar güvenliği", async () => {
  const pg = new PGlite();
  try {
    for (const file of (await readdir("db/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await pg.exec(await readFile(`db/migrations/${file}`, "utf8"));
    const d = drizzle(pg, { schema });
    const [rize] = await d
      .insert(schema.cities)
      .values({ name: "Rize", slug: "rize-custom" })
      .returning();
    const [merkez] = await d
      .insert(schema.districts)
      .values({ name: "Rize Merkez", slug: "rize-merkez", cityId: rize.id })
      .returning();
    await d
      .insert(schema.neighborhoods)
      .values({ name: "Çarşı", districtId: merkez.id });
    assert.equal(turkeyLocationCounts.cities, 81);
    assert.equal(turkeyLocationCounts.districts, 973);
    assert.equal(turkeyLocationCounts.neighborhoods, 31947);
    const first = await importTurkeyLocations(d);
    assert.equal(first.addedCities, 80);
    assert.equal(first.addedDistricts, 972);
    const cities = await d.select().from(schema.cities),
      districts = await d.select().from(schema.districts);
    assert.equal(cities.length, 81);
    assert.equal(districts.length, 973);
    assert.equal(cities.find((c) => c.name === "Rize")?.id, rize.id);
    assert.equal(districts.filter((x) => x.cityId === rize.id).length, 12);
    assert.ok(
      districts.some((x) => x.cityId === rize.id && x.name === "Çamlıhemşin"),
    );
    assert.equal(
      (await d.select().from(schema.neighborhoods))[0].districtId,
      merkez.id,
    );
    const allNeighborhoods = await d.select().from(schema.neighborhoods);
    assert.equal(allNeighborhoods.length, 31947);
    assert.equal(first.addedNeighborhoods, 31946);
    assert.equal(
      allNeighborhoods.filter(
        (n) => n.districtId === merkez.id && n.name === "Çarşı",
      ).length,
      1,
    );
    const second = await importTurkeyLocations(d);
    assert.equal(second.addedCities, 0);
    assert.equal(second.addedDistricts, 0);
    assert.equal(second.addedNeighborhoods, 0);
  } finally {
    await pg.close();
  }
});
