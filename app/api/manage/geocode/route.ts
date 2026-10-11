import { addressQuery } from "@/lib/geocoding";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cities, districts, neighborhoods } from "@/db/schema";
import {
  requireAdmin,
  sameOrigin,
  jsonBody,
  limit,
  HttpError,
  apiError,
} from "@/lib/security";
import { lookupAddress } from "@/lib/geocoding-server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = await requireAdmin();
    await limit(`geocode-owner:${owner.id}`, 10, 60);
    const input = z
      .object({
        address: z.string().trim().min(5).max(500),
        cityId: z.string().uuid(),
        districtId: z.string().uuid(),
        neighborhoodId: z.string().uuid().nullish(),
      })
      .parse(await jsonBody(request));
    const [city] = await db()
      .select()
      .from(cities)
      .where(eq(cities.id, input.cityId));
    const [district] = await db()
      .select()
      .from(districts)
      .where(eq(districts.id, input.districtId));
    if (!city || !district || district.cityId !== city.id)
      throw new HttpError(400, "Önce il ve ilçeyi seçin.");
    const [neighborhood] = input.neighborhoodId
      ? await db()
          .select()
          .from(neighborhoods)
          .where(eq(neighborhoods.id, input.neighborhoodId))
      : [];
    if (input.neighborhoodId && neighborhood?.districtId !== district.id)
      throw new HttpError(400, "Mahalle seçimi ilçe ile eşleşmiyor.");
    const context = {
      address: input.address,
      district: district.name,
      city: city.name,
      neighborhood: neighborhood?.name,
    };
    const places = await lookupAddress(
      addressQuery(input.address, district.name, city.name, neighborhood?.name),
      context,
    );
    return Response.json({ places, context });
  } catch (error) {
    return apiError(error);
  }
}
