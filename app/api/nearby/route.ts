import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uuid } from "@/lib/validation";
import { apiError, currentUser, HttpError, limit } from "@/lib/security";
import { nearbyCategories, nearbyResultLimit } from "@/lib/nearby";
import { findNearby, nearbyRoutes } from "@/lib/nearby-server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const id = uuid.parse(params.get("id"));
    const routes = params.get("routes");
    if (routes && !nearbyCategories.some((c) => c === routes))
      throw new HttpError(400, "Geçersiz kategori.");
    const count = Math.min(
      nearbyResultLimit,
      Math.max(12, Math.floor(Number(params.get("count")) || 12)),
    );
    const [listing] = await db()
      .select()
      .from(listings)
      .where(eq(listings.id, id));
    if (
      !listing ||
      (listing.status !== "published" &&
        (await currentUser())?.id !== listing.userId)
    )
      throw new HttpError(404, "İlan bulunamadı.");
    if (listing.latitude === null || listing.longitude === null)
      throw new HttpError(
        422,
        "Yakındaki yerleri görmek için ilan konumu iğneyle kaydedilmeli.",
      );
    await limit(
      `nearby:${req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}`,
      60,
      60,
    );
    const lat = Number(listing.latitude),
      lon = Number(listing.longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      throw new HttpError(
        422,
        "İlan konumu geçersiz. İlanı düzenleyerek konumu yeniden seçin.",
      );
    if (routes)
      return Response.json({
        places: await nearbyRoutes(lat, lon, routes, count),
      });
    return Response.json(await findNearby(lat, lon));
  } catch (error) {
    return apiError(error);
  }
}
