import type { MetadataRoute } from "next";
import { agencyListingsScope } from "@/lib/agency";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pages: MetadataRoute.Sitemap = [
    { url: base },
    { url: `${base}/ilanlar` },
    { url: `${base}/iletisim` },
  ];
  if (!process.env.DATABASE_URL) return pages;
  const rows = await db()
    .select({ slug: listings.slug, updatedAt: listings.updatedAt })
    .from(listings)
    .where(and(agencyListingsScope(), eq(listings.status, "published")));
  return [
    ...pages,
    ...rows.map((r) => ({
      url: `${base}/ilan/${r.slug}`,
      lastModified: r.updatedAt,
    })),
  ];
}
