import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uuid } from "@/lib/validation";
import { apiError, currentUser, HttpError, limit } from "@/lib/security";
import { findNearby } from "@/lib/nearby-server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const id = uuid.parse(new URL(req.url).searchParams.get("id"));
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
      20,
      60,
    );
    return Response.json({
      places: await findNearby(
        Number(listing.latitude),
        Number(listing.longitude),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
