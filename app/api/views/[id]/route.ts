import { cookies } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { agencyListingsScope } from "@/lib/agency";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { uuid } from "@/lib/validation";
import { sameOrigin, limit, apiError, HttpError } from "@/lib/security";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const id = uuid.parse((await params).id);
    const jar = await cookies();
    let viewer = jar.get("mct-visitor")?.value;
    if (!viewer || !uuid.safeParse(viewer).success) {
      viewer = crypto.randomUUID();
      jar.set("mct-visitor", viewer, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    await limit(`view:${viewer}:${id}`, 1, 60 * 60);
    await db()
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount}+1` })
      .where(
        and(
          agencyListingsScope(),
          eq(listings.id, id),
          eq(listings.status, "published"),
        ),
      );
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError && e.status === 429)
      return Response.json({ ok: true });
    return apiError(e);
  }
}
