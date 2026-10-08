import { addressQuery, automaticPlace } from "@/lib/geocoding";
import { importTurkeyLocations } from "@/lib/location-import";
import { after } from "next/server";
import { findNearby } from "@/lib/nearby-server";
import { deleteLocation } from "@/lib/location-delete";
import { lookupAddress } from "@/lib/geocoding-server";
import {
  publicationStatus,
  publicationUpdate,
  ownedListing,
} from "@/lib/publication";
import { db } from "@/db";
import {
  listings,
  listingImages,
  favorites,
  messages,
  user,
  districts,
  neighborhoods,
  propertyTypes,
  storageJobs,
  auditLogs,
} from "@/db/schema";
import { and, eq, or, asc } from "drizzle-orm";
import {
  requireAdmin,
  assertOwner,
  sameOrigin,
  apiError,
  HttpError,
  limit,
  jsonBody,
  formBody,
} from "@/lib/security";
import { listingInput, messageInput, uuid, slugify } from "@/lib/validation";
import { saveListing } from "@/lib/listing-save";
import { storage, imageKind } from "@/lib/storage";
import { z } from "zod";
export const runtime = "nodejs";
async function cleanup() {
  try {
    const jobs = await db().select().from(storageJobs).limit(20);
    for (const job of jobs) {
      await storage().uploader.destroy(job.storageKey, { invalidate: true });
      await db().delete(storageJobs).where(eq(storageJobs.id, job.id));
    }
  } catch {
    console.error("Storage cleanup deferred");
  }
}
async function handle(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    if (req.method !== "GET") sameOrigin(req);
    const u = await requireAdmin();
    const { path } = await ctx.params;
    const [resource, id, action] = path;
    if (req.method !== "GET")
      await limit(`${u.id}:${resource}`, resource === "images" ? 25 : 40);
    if (resource === "listings") {
      if (req.method === "PATCH" && id && action === "status") {
        uuid.parse(id);
        const { status } = z
          .object({ status: publicationStatus })
          .parse(await jsonBody(req));
        const [listing] = await db()
          .update(listings)
          .set(publicationUpdate(status))
          .where(ownedListing(id, u.id))
          .returning();
        if (!listing)
          throw new HttpError(
            404,
            "İlan bulunamadı veya bu ilana erişiminiz yok.",
          );
        return Response.json({ listing });
      }
      if ((req.method === "POST" && !id) || (req.method === "PATCH" && id)) {
        const input = listingInput.parse(await jsonBody(req));
        if (input.latitude == null && input.longitude == null) {
          const { cities } = await import("@/db/schema");
          const [city] = await db()
            .select()
            .from(cities)
            .where(eq(cities.id, input.cityId));
          const [district] = await db()
            .select()
            .from(districts)
            .where(eq(districts.id, input.districtId));
          if (city && district?.cityId === city.id) {
            try {
              const places = await lookupAddress(
                addressQuery(input.address, district.name, city.name),
              );
              const point = automaticPlace(places, input.address);
              if (point) {
                input.latitude = Number(point.latitude);
                input.longitude = Number(point.longitude);
              }
            } catch {
              console.error(
                "Address lookup unavailable; an explicit pin is required before saving",
              );
            }
          }
        }
        if (input.latitude == null || input.longitude == null) {
          throw new HttpError(
            422,
            "Adres için kesin konum bulunamadı. Harita sonuçlarından doğru adresi seçin veya haritada iğne yerleştirin; ardından ilanı kaydedin.",
          );
        }
        const saved = await saveListing(db(), u, input, id);
        if (saved.latitude !== null && saved.longitude !== null) {
          after(async () => {
            try {
              await findNearby(Number(saved.latitude), Number(saved.longitude));
            } catch {
              console.error(
                "Nearby analysis unavailable; it will be retried on the detail page.",
              );
            }
          });
        }
        return Response.json({ listing: saved }, { status: id ? 200 : 201 });
      }
      if (req.method === "DELETE" && id) {
        uuid.parse(id);
        await db().transaction(async (tx) => {
          const [row] = await tx
            .select()
            .from(listings)
            .where(eq(listings.id, id))
            .for("update");
          if (!row) throw new HttpError(404, "İlan bulunamadı.");
          assertOwner(u, row.userId);
          const imgs = await tx
            .select()
            .from(listingImages)
            .where(eq(listingImages.listingId, id));
          if (imgs.length)
            await tx
              .insert(storageJobs)
              .values(imgs.map((i) => ({ storageKey: i.storageKey })))
              .onConflictDoNothing();
          await tx.delete(listings).where(eq(listings.id, id));
          await tx
            .insert(auditLogs)
            .values({ actorId: u.id, action: "listing.delete", targetId: id });
        });
        await cleanup();
        return Response.json({ ok: true });
      }
    }
    if (resource === "images" && id) {
      uuid.parse(id);
      if (req.method === "POST") {
        const length = Number(req.headers.get("content-length") || 0);
        if (length > 5 * 1024 * 1024)
          throw new HttpError(413, "Dosya çok büyük.");
        const form = await formBody(req);
        const f = form.get("file");
        if (
          !(f instanceof File) ||
          f.size > 4 * 1024 * 1024 ||
          f.size === 0 ||
          !["image/jpeg", "image/png", "image/webp"].includes(f.type)
        )
          throw new HttpError(400, "JPG, PNG veya WebP; en fazla 4 MB.");
        const bytes = Buffer.from(await f.arrayBuffer());
        if (!imageKind(bytes))
          throw new HttpError(400, "Geçersiz resim dosyası.");
        const [listing] = await db()
          .select()
          .from(listings)
          .where(eq(listings.id, id));
        if (!listing) throw new HttpError(404, "İlan bulunamadı.");
        assertOwner(u, listing.userId);
        const imgs = await db()
          .select()
          .from(listingImages)
          .where(eq(listingImages.listingId, id));
        if (imgs.length >= 20)
          throw new HttpError(400, "En fazla 20 fotoğraf ekleyebilirsiniz.");
        const uploaded = await storage().uploader.upload(
          `data:${f.type};base64,${bytes.toString("base64")}`,
          {
            folder: `mct-emlak/${id}`,
            resource_type: "image",
            allowed_formats: ["jpg", "png", "webp"],
            transformation: [{ width: 2400, height: 2400, crop: "limit" }],
          },
        );
        try {
          await db().transaction(async (tx) => {
            const [r] = await tx
              .select()
              .from(listings)
              .where(eq(listings.id, id))
              .for("update");
            if (!r) throw new HttpError(404, "İlan bulunamadı.");
            assertOwner(u, r.userId);
            const all = await tx
              .select()
              .from(listingImages)
              .where(eq(listingImages.listingId, id));
            if (all.length >= 20)
              throw new HttpError(400, "En fazla 20 fotoğraf.");
            await tx.insert(listingImages).values({
              listingId: id,
              imageUrl: uploaded.secure_url,
              storageKey: uploaded.public_id,
              altText: r.title,
              sortOrder: all.length,
              isPrimary: all.length === 0,
            });
            await tx
              .update(listings)
              .set({ updatedAt: new Date() })
              .where(eq(listings.id, id));
          });
        } catch (e) {
          await db()
            .insert(storageJobs)
            .values({ storageKey: uploaded.public_id })
            .onConflictDoNothing();
          await cleanup();
          throw e;
        }
        return Response.json({ ok: true });
      }
      if (req.method === "PATCH") {
        const input = z
          .object({ ids: z.array(uuid).min(1).max(20), primary: uuid })
          .parse(await jsonBody(req));
        await db().transaction(async (tx) => {
          const [r] = await tx
            .select()
            .from(listings)
            .where(eq(listings.id, id))
            .for("update");
          if (!r) throw new HttpError(404, "İlan bulunamadı.");
          assertOwner(u, r.userId);
          const all = await tx
            .select()
            .from(listingImages)
            .where(eq(listingImages.listingId, id));
          if (
            new Set(input.ids).size !== all.length ||
            input.ids.length !== all.length ||
            !all.every((i) => input.ids.includes(i.id)) ||
            !input.ids.includes(input.primary)
          )
            throw new HttpError(400, "Fotoğraf sırası geçersiz.");
          await tx
            .update(listingImages)
            .set({ isPrimary: false })
            .where(eq(listingImages.listingId, id));
          for (let n = 0; n < input.ids.length; n++)
            await tx
              .update(listingImages)
              .set({ sortOrder: n, isPrimary: input.ids[n] === input.primary })
              .where(eq(listingImages.id, input.ids[n]));
          await tx
            .update(listings)
            .set({ updatedAt: new Date() })
            .where(eq(listings.id, id));
        });
        return Response.json({ ok: true });
      }
      if (req.method === "DELETE" && action) {
        uuid.parse(action);
        await db().transaction(async (tx) => {
          const [r] = await tx
            .select()
            .from(listings)
            .where(eq(listings.id, id))
            .for("update");
          if (!r) throw new HttpError(404, "İlan bulunamadı.");
          assertOwner(u, r.userId);
          const [img] = await tx
            .select()
            .from(listingImages)
            .where(
              and(
                eq(listingImages.id, action),
                eq(listingImages.listingId, id),
              ),
            );
          if (!img) throw new HttpError(404, "Fotoğraf bulunamadı.");
          await tx
            .insert(storageJobs)
            .values({ storageKey: img.storageKey })
            .onConflictDoNothing();
          await tx.delete(listingImages).where(eq(listingImages.id, action));
          if (img.isPrimary) {
            const [first] = await tx
              .select()
              .from(listingImages)
              .where(eq(listingImages.listingId, id))
              .orderBy(asc(listingImages.sortOrder))
              .limit(1);
            if (first)
              await tx
                .update(listingImages)
                .set({ isPrimary: true })
                .where(eq(listingImages.id, first.id));
          }
          await tx
            .update(listings)
            .set({ updatedAt: new Date() })
            .where(eq(listings.id, id));
        });
        await cleanup();
        return Response.json({ ok: true });
      }
    }
    if (resource === "favorites" && id) {
      uuid.parse(id);
      if (req.method === "POST") {
        const [r] = await db()
          .select({ id: listings.id })
          .from(listings)
          .where(and(eq(listings.id, id), eq(listings.status, "published")));
        if (!r) throw new HttpError(404, "İlan bulunamadı.");
        await db()
          .insert(favorites)
          .values({ userId: u.id, listingId: id })
          .onConflictDoNothing();
        return Response.json({ ok: true });
      }
      if (req.method === "DELETE") {
        await db()
          .delete(favorites)
          .where(and(eq(favorites.userId, u.id), eq(favorites.listingId, id)));
        return Response.json({ ok: true });
      }
    }
    if (resource === "messages") {
      if (req.method === "POST") {
        await limit(`message:${u.id}`, 10, 60);
        const input = messageInput.parse(await jsonBody(req));
        const [listing] = await db()
          .select()
          .from(listings)
          .where(eq(listings.id, input.listingId));
        if (!listing) throw new HttpError(404, "İlan bulunamadı.");
        let recipient = listing.userId;
        if (input.recipientId && input.recipientId !== listing.userId) {
          const prior = await db()
            .select({ id: messages.id })
            .from(messages)
            .where(
              and(
                eq(messages.listingId, listing.id),
                or(
                  and(
                    eq(messages.senderId, input.recipientId),
                    eq(messages.recipientId, u.id),
                  ),
                  and(
                    eq(messages.senderId, u.id),
                    eq(messages.recipientId, input.recipientId),
                  ),
                ),
              ),
            )
            .limit(1);
          if (!prior.length)
            throw new HttpError(403, "Bu görüşmeye erişiminiz yok.");
          recipient = input.recipientId;
        } else if (listing.status !== "published" && u.id !== listing.userId)
          throw new HttpError(404, "İlan bulunamadı.");
        if (recipient === u.id)
          throw new HttpError(400, "Kendinize mesaj gönderemezsiniz.");
        await db().insert(messages).values({
          senderId: u.id,
          recipientId: recipient,
          listingId: listing.id,
          body: input.body,
        });
        return Response.json({ ok: true });
      }
      if (req.method === "PATCH" && id) {
        uuid.parse(id);
        await db()
          .update(messages)
          .set({ readAt: new Date() })
          .where(and(eq(messages.id, id), eq(messages.recipientId, u.id)));
        return Response.json({ ok: true });
      }
    }
    if (resource === "profile" && req.method === "PATCH") {
      const input = z
        .object({
          name: z.string().trim().min(2).max(100),
          phone: z
            .string()
            .regex(/^\+?[0-9 ()-]{7,25}$/)
            .or(z.literal("")),
        })
        .parse(await jsonBody(req));
      await db()
        .update(user)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(user.id, u.id));
      return Response.json({ ok: true });
    }
    if (resource === "users")
      throw new HttpError(
        403,
        "Bu site yalnızca işletme sahibi tarafından yönetilir.",
      );
    if (resource === "locations" && req.method === "DELETE" && id && action) {
      await deleteLocation(db(), id, action);
      return Response.json({ ok: true });
    }
    if (resource === "locations" && req.method === "POST" && id === "import") {
      return Response.json(await importTurkeyLocations(db()));
    }
    if (resource === "locations" && req.method === "POST") {
      await requireAdmin();
      const input = z
        .discriminatedUnion("kind", [
          z.object({
            kind: z.literal("city"),
            name: z.string().trim().min(2).max(100),
          }),
          z.object({
            kind: z.literal("district"),
            name: z.string().trim().min(2).max(100),
            parent: uuid,
          }),
          z.object({
            kind: z.literal("neighborhood"),
            name: z.string().trim().min(2).max(100),
            parent: uuid,
          }),
          z.object({
            kind: z.literal("property"),
            name: z.string().trim().min(2).max(100),
            allowSale: z.boolean(),
            allowRent: z.boolean(),
          }),
        ])
        .parse(await jsonBody(req));
      const { cities } = await import("@/db/schema");
      if (input.kind === "city")
        await db()
          .insert(cities)
          .values({ name: input.name, slug: slugify(input.name) });
      if (input.kind === "district")
        await db()
          .insert(districts)
          .values({
            name: input.name,
            slug: slugify(input.name),
            cityId: input.parent,
          });
      if (input.kind === "neighborhood")
        await db()
          .insert(neighborhoods)
          .values({ name: input.name, districtId: input.parent });
      if (input.kind === "property")
        await db()
          .insert(propertyTypes)
          .values({
            name: input.name,
            slug: slugify(input.name),
            allowSale: input.allowSale,
            allowRent: input.allowRent,
          });
      return Response.json({ ok: true });
    }
    if (resource === "cleanup" && req.method === "POST") {
      await requireAdmin();
      await cleanup();
      return Response.json({ ok: true });
    }
    throw new HttpError(404, "İşlem bulunamadı.");
  } catch (e) {
    return apiError(e);
  }
}
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
