import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { listings } from "@/db/schema";
export const publicationStatus = z.enum(["draft", "published", "archived"]);
export function ownerListingStatus(status?: string) {
  return status === "pending"
    ? "draft"
    : publicationStatus.parse(status ?? "published");
}
export function ownedListing(id: string, ownerId: string) {
  return and(eq(listings.id, id), eq(listings.userId, ownerId));
}
export function publicationUpdate(status: z.infer<typeof publicationStatus>) {
  return {
    status,
    updatedAt: new Date(),
    publishedAt:
      status === "published"
        ? sql`coalesce(${listings.publishedAt}, now())`
        : listings.publishedAt,
  };
}
