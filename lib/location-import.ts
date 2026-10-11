import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { cities, districts, neighborhoods } from "@/db/schema";
import data from "@/db/seed/turkey-locations.json";
import neighborhoodData from "@/db/seed/turkey-neighborhoods.json";
import { slugify } from "./validation";
export const turkeyLocationCounts = {
  neighborhoods: neighborhoodData.reduce((n, d) => n + d.names.length, 0),
  cities: data.length,
  districts: data.reduce((n, c) => n + c.districts.length, 0),
};
const key = (name: string) => slugify(name.normalize("NFC"));
export async function importTurkeyLocations<T extends PgQueryResultHKT>(
  database: PgDatabase<T, typeof schema>,
) {
  return database.transaction(async (tx) => {
    const existing = await tx.select().from(cities);
    const missing = data.filter(
      (c) =>
        !existing.some(
          (e) => key(e.name) === key(c.name) || e.slug === key(c.name),
        ),
    );
    const addedCities = missing.length
      ? await tx
          .insert(cities)
          .values(missing.map((c) => ({ name: c.name, slug: key(c.name) })))
          .onConflictDoNothing()
          .returning()
      : [];
    const allCities = await tx.select().from(cities);
    const oldDistricts = await tx.select().from(districts);
    const pending: { cityId: string; name: string; slug: string }[] = [];
    for (const c of data) {
      const city = allCities.find(
        (e) => key(e.name) === key(c.name) || e.slug === key(c.name),
      );
      if (!city) throw new Error(`${c.name} ili eşleştirilemedi.`);
      for (const name of c.districts) {
        const slug = key(name);
        const exists = oldDistricts.some(
          (e) =>
            e.cityId === city.id &&
            (e.slug === slug ||
              key(e.name) === slug ||
              (slug === "merkez" &&
                [key(c.name), `${key(c.name)}-merkez`].includes(key(e.name)))),
        );
        if (!exists)
          pending.push({
            cityId: city.id,
            name: name === "Merkez" ? `${c.name} Merkez` : name,
            slug,
          });
      }
    }
    const addedDistricts = pending.length
      ? await tx
          .insert(districts)
          .values(pending)
          .onConflictDoNothing()
          .returning()
      : [];
    const allDistricts = await tx.select().from(districts);
    const existingNeighborhoods = await tx.select().from(neighborhoods);
    const known = new Set(
      existingNeighborhoods.map(
        (n) =>
          `${n.districtId}:${n.name
            .normalize("NFC")
            .trim()
            .toLocaleLowerCase("tr-TR")
            .replace(/\s+mah(allesi)?\.?$/i, "")}`,
      ),
    );
    const pendingNeighborhoods: { districtId: string; name: string }[] = [];
    for (const group of neighborhoodData) {
      const city = allCities.find((c) => key(c.name) === key(group.city));
      const district = allDistricts.find(
        (d) =>
          d.cityId === city?.id &&
          (key(d.name) === key(group.district) ||
            (key(group.district) === "merkez" &&
              [key(group.city), `${key(group.city)}-merkez`].includes(
                key(d.name),
              ))),
      );
      if (!district)
        throw new Error(`${group.city} / ${group.district} eşleştirilemedi.`);
      for (const name of group.names) {
        const id = `${district.id}:${name
          .normalize("NFC")
          .trim()
          .toLocaleLowerCase("tr-TR")
          .replace(/\s+mah(allesi)?\.?$/i, "")}`;
        if (!known.has(id)) {
          pendingNeighborhoods.push({ districtId: district.id, name });
          known.add(id);
        }
      }
    }
    let addedNeighborhoods = 0;
    for (let i = 0; i < pendingNeighborhoods.length; i += 500) {
      const inserted = await tx
        .insert(neighborhoods)
        .values(pendingNeighborhoods.slice(i, i + 500))
        .onConflictDoNothing()
        .returning({ id: neighborhoods.id });
      addedNeighborhoods += inserted.length;
    }
    return {
      addedNeighborhoods,
      addedCities: addedCities.length,
      addedDistricts: addedDistricts.length,
      ...turkeyLocationCounts,
    };
  });
}
