import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { agencyListingsScope } from "./agency";
import { db } from "@/db";
import {
  listings,
  listingImages,
  cities,
  districts,
  neighborhoods,
  propertyTypes,
  user,
  favorites,
} from "@/db/schema";
import {
  and,
  eq,
  ilike,
  or,
  gte,
  lte,
  asc,
  desc,
  count,
  sql,
  inArray,
  type SQL,
} from "drizzle-orm";
export type SearchParams = Record<string, string | string[] | undefined>;
export const val = (p: SearchParams, k: string) =>
  typeof p[k] === "string" ? (p[k] as string) : "";
export async function locations(districtId?: string) {
  const d = db();
  const [city, district, neighborhood, types] = await Promise.all([
    d.select().from(cities).orderBy(asc(cities.name)),
    d.select().from(districts).orderBy(asc(districts.name)),
    districtId
      ? d
          .select()
          .from(neighborhoods)
          .where(eq(neighborhoods.districtId, districtId))
          .orderBy(asc(neighborhoods.name))
      : Promise.resolve([] as (typeof neighborhoods.$inferSelect)[]),
    d.select().from(propertyTypes).orderBy(asc(propertyTypes.name)),
  ]);
  return {
    cities: city,
    districts: district,
    neighborhoods: neighborhood,
    types,
  };
}
export async function searchListings(
  p: SearchParams = {},
  scope?: { owner?: string; favorites?: string; admin?: boolean },
) {
  return queryListings(db(), p, scope);
}
export async function queryListings<T extends PgQueryResultHKT>(
  database: PgDatabase<T, typeof schema>,
  p: SearchParams = {},
  scope?: { owner?: string; favorites?: string; admin?: boolean },
) {
  const where: SQL[] = [agencyListingsScope()];
  if (!scope?.admin && !scope?.owner)
    where.push(eq(listings.status, "published"));
  if (scope?.owner) where.push(eq(listings.userId, scope.owner));
  if (scope?.favorites)
    where.push(
      sql`exists (select 1 from ${favorites} where ${favorites.listingId}=${listings.id} and ${favorites.userId}=${scope.favorites})`,
    );
  const status = val(p, "status");
  if (
    (scope?.admin || scope?.owner) &&
    ["draft", "pending", "published", "archived"].includes(status)
  )
    where.push(eq(listings.status, status));
  const q = val(p, "q").slice(0, 100);
  if (q)
    where.push(
      or(
        ilike(listings.title, `%${q.replace(/[%_\\]/g, "")}%`),
        ilike(listings.description, `%${q.replace(/[%_\\]/g, "")}%`),
      )!,
    );
  const type = val(p, "type");
  if (["satilik", "kiralik"].includes(type))
    where.push(eq(listings.listingType, type));
  for (const [key, col] of [
    ["city", listings.cityId],
    ["district", listings.districtId],
    ["neighborhood", listings.neighborhoodId],
    ["property", listings.propertyTypeId],
  ] as const) {
    const v = val(p, key);
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    )
      where.push(eq(col, v));
  }
  if (val(p, "minPrice") || val(p, "maxPrice"))
    where.push(
      sql`not exists (select 1 from listing_features f where f.listing_id = ${listings.id} and f.name = 'Kat karşılığı' and f.value = 'Evet')`,
    );
  for (const [key, col, op] of [
    ["minPrice", listings.price, gte],
    ["maxPrice", listings.price, lte],
  ] as const) {
    const v = val(p, key);
    if (v && Number.isFinite(Number(v)) && Number(v) >= 0)
      where.push(op(col, v));
  }
  for (const [key, col, op] of [
    ["minArea", listings.areaM2, gte],
    ["maxArea", listings.areaM2, lte],
    ["maxAge", listings.buildingAge, lte],
    ["floor", listings.floor, eq],
  ] as const) {
    const v = val(p, key);
    if (v && Number.isSafeInteger(Number(v))) where.push(op(col, Number(v)));
  }
  if (val(p, "rooms")) where.push(eq(listings.roomCount, val(p, "rooms")));
  if (val(p, "heating"))
    where.push(eq(listings.heatingType, val(p, "heating")));
  if (val(p, "featured") === "true") where.push(eq(listings.featured, true));
  for (const k of [
    "balcony",
    "elevator",
    "parking",
    "furnished",
    "complex",
    "seaView",
  ] as const)
    if (val(p, k) === "true") where.push(eq(listings[k], true));
  const sort = val(p, "sort");
  const order =
    sort === "oldest"
      ? asc(listings.createdAt)
      : sort === "priceAsc"
        ? asc(listings.price)
        : sort === "priceDesc"
          ? desc(listings.price)
          : sort === "areaAsc"
            ? asc(listings.areaM2)
            : sort === "areaDesc"
              ? desc(listings.areaM2)
              : desc(listings.createdAt);
  const page = Math.max(1, Math.min(100000, parseInt(val(p, "page")) || 1));
  const filter = and(...where);
  const [tot] = await database
    .select({ n: count() })
    .from(listings)
    .where(filter);
  const items = await database
    .select({
      listing: listings,
      city: cities.name,
      district: districts.name,
      property: propertyTypes.name,
      image: listingImages.imageUrl,
      landExchange: sql<boolean>`exists (select 1 from listing_features f where f.listing_id = ${listings.id} and f.name = 'Kat karşılığı' and f.value = 'Evet')`,
    })
    .from(listings)
    .innerJoin(cities, eq(cities.id, listings.cityId))
    .innerJoin(districts, eq(districts.id, listings.districtId))
    .innerJoin(propertyTypes, eq(propertyTypes.id, listings.propertyTypeId))
    .leftJoin(
      listingImages,
      and(
        eq(listingImages.listingId, listings.id),
        eq(listingImages.isPrimary, true),
      ),
    )
    .where(filter)
    .orderBy(order, asc(listings.id))
    .limit(12)
    .offset((page - 1) * 12);
  return { items, total: tot.n, page, pages: Math.ceil(tot.n / 12) };
}
export async function listingDetail(slug: string) {
  const [row] = await db()
    .select({
      listing: listings,
      city: cities.name,
      district: districts.name,
      property: propertyTypes.name,
      owner: { id: user.id, name: user.name, phone: user.phone },
    })
    .from(listings)
    .innerJoin(cities, eq(cities.id, listings.cityId))
    .innerJoin(districts, eq(districts.id, listings.districtId))
    .innerJoin(propertyTypes, eq(propertyTypes.id, listings.propertyTypeId))
    .innerJoin(user, eq(user.id, listings.userId))
    .where(and(eq(listings.slug, slug), agencyListingsScope()));
  if (!row) return null;
  const images = await db()
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, row.listing.id))
    .orderBy(asc(listingImages.sortOrder));
  return { ...row, images };
}
export async function favoriteIds(id: string) {
  return (
    await db()
      .select({ id: favorites.listingId })
      .from(favorites)
      .where(eq(favorites.userId, id))
  ).map((r) => r.id);
}
export { inArray };
