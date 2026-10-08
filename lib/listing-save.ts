import { isLandType, isRentalApartment } from "./property-kind";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  listings,
  listingFeatures,
  districts,
  neighborhoods,
  propertyTypes,
} from "@/db/schema";
import { listingInput, uuid, slugify } from "./validation";
import { ownerListingStatus } from "./publication";
import { HttpError, assertOwner } from "./security";
import type { z } from "zod";
export async function saveListing<T extends PgQueryResultHKT>(
  database: PgDatabase<T, typeof schema>,
  owner: { id: string; role: string },
  input: z.output<typeof listingInput>,
  id?: string,
) {
  const { features, isLand, ...data } = input;
  const [district] = await database
    .select()
    .from(districts)
    .where(eq(districts.id, data.districtId));
  if (!district || district.cityId !== data.cityId)
    throw new HttpError(400, "İl ve ilçe eşleşmiyor.");
  if (data.neighborhoodId) {
    const [n] = await database
      .select()
      .from(neighborhoods)
      .where(eq(neighborhoods.id, data.neighborhoodId));
    if (n?.districtId !== data.districtId)
      throw new HttpError(400, "Mahalle ve ilçe eşleşmiyor.");
  }
  const [pt] = await database
    .select()
    .from(propertyTypes)
    .where(eq(propertyTypes.id, data.propertyTypeId));
  if (!pt || (data.listingType === "satilik" ? !pt.allowSale : !pt.allowRent))
    throw new HttpError(400, "Gayrimenkul türü uygun değil.");
  const land = isLandType(pt);
  if (
    features.some((f) => f.name === "WC Sayısı") &&
    !isRentalApartment(data.listingType, pt)
  )
    throw new HttpError(
      400,
      "WC sayısı yalnızca kiralık dairelerde kullanılabilir.",
    );
  if (isLand && !land)
    throw new HttpError(400, "Arsa seçimi gayrimenkul türüyle eşleşmiyor.");
  if (
    features.some((f) => f.name === "Kat karşılığı" && f.value === "Evet") &&
    !land
  )
    throw new HttpError(
      400,
      "Kat karşılığı yalnızca arsa ilanlarında kullanılabilir.",
    );
  const status = ownerListingStatus(data.status);
  const values = {
    ...data,
    roomCount: land ? "Uygulanmaz" : data.roomCount!,
    buildingAge: land ? 0 : data.buildingAge!,
    floor: land ? 0 : data.floor!,
    totalFloors: land ? 1 : data.totalFloors!,
    heatingType: land ? "Uygulanmaz" : data.heatingType!,
    bathroomCount: land ? 0 : data.bathroomCount!,
    balcony: land ? false : data.balcony,
    elevator: land ? false : data.elevator,
    furnished: land ? false : data.furnished,
    complex: land ? false : data.complex,
    // Existing positive_price constraint needs an internal placeholder for non-monetary exchanges.
    price: features.some(
      (f) => f.name === "Kat karşılığı" && f.value === "Evet",
    )
      ? "1"
      : String(data.price),
    latitude: data.latitude == null ? null : String(data.latitude),
    longitude: data.longitude == null ? null : String(data.longitude),
    neighborhoodId: data.neighborhoodId || null,
    status,
    featured: !!data.featured,
    updatedAt: new Date(),
    publishedAt: status === "published" ? new Date() : null,
  };
  return database.transaction(async (tx) => {
    let row;
    if (id) {
      uuid.parse(id);
      const [old] = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .for("update");
      if (!old) throw new HttpError(404, "İlan bulunamadı.");
      assertOwner(owner, old.userId);
      [row] = await tx
        .update(listings)
        .set({
          ...values,
          publishedAt:
            status === "published"
              ? old.publishedAt || new Date()
              : old.publishedAt,
        })
        .where(eq(listings.id, id))
        .returning();
      await tx.delete(listingFeatures).where(eq(listingFeatures.listingId, id));
    } else {
      const newId = crypto.randomUUID();
      [row] = await tx
        .insert(listings)
        .values({
          ...values,
          id: newId,
          slug: `${slugify(data.title)}-${newId}`,
          userId: owner.id,
        })
        .returning();
    }
    if (features.length)
      await tx
        .insert(listingFeatures)
        .values(features.map((f) => ({ ...f, listingId: row.id })));
    return row;
  });
}
