import { agencyListingsScope } from "@/lib/agency";
import { db } from "@/db";
import {
  listings,
  listingImages,
  cities,
  districts,
  propertyTypes,
} from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { uuid } from "@/lib/validation";
import { apiError, HttpError } from "@/lib/security";
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get("ids") || "";
    const ids = raw.split(",").filter(Boolean);
    if (ids.length > 100 || !ids.every((id) => uuid.safeParse(id).success))
      throw new HttpError(400, "İlan listesi geçersiz.");
    if (!ids.length) return Response.json({ items: [] });
    const items = await db()
      .select({
        listing: listings,
        city: cities.name,
        district: districts.name,
        property: propertyTypes.name,
        image: listingImages.imageUrl,
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
      .where(
        and(
          agencyListingsScope(),
          eq(listings.status, "published"),
          inArray(listings.id, ids),
        ),
      )
      .orderBy(desc(listings.createdAt));
    return Response.json({ items });
  } catch (e) {
    return apiError(e);
  }
}
