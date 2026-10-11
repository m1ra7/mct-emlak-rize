import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import {
  ownerListingStatus,
  ownedListing,
  publicationUpdate,
} from "../lib/publication";
import * as schema from "../db/schema";
import { hashPassword } from "better-auth/crypto";
import { createAuthentication } from "../lib/auth";
import { listingInput, slugify } from "../lib/validation";
import { imageKind } from "../lib/storage";
import { agencyListingsScope, isAgencyOwner } from "../lib/agency";
import { assertOwner, sameOrigin } from "../lib/security";
test("İşletme sahibinin yayın durumu: onay adımı yok", () => {
  assert.equal(ownerListingStatus(), "published");
  assert.equal(ownerListingStatus("draft"), "draft");
  assert.equal(ownerListingStatus("pending"), "draft");
  assert.equal(ownerListingStatus("archived"), "archived");
  assert.throws(() => ownerListingStatus("unknown"));
});
test("Türkçe slug ve yetki sınırları", () => {
  assert.equal(
    slugify("Çayeli Deniz Manzaralı 3+1"),
    "cayeli-deniz-manzarali-3-1",
  );
  assert.throws(() => assertOwner({ id: "a", role: "user" }, "b"));
  assert.doesNotThrow(() => assertOwner({ id: "a", role: "user" }, "a"));
  assert.throws(() => assertOwner({ id: "a", role: "admin" }, "b"));
  process.env.ADMIN_EMAIL = "test@example.com";
  assert.equal(
    isAgencyOwner({ email: "test@example.com", role: "admin", active: true }),
    true,
  );
  assert.equal(
    isAgencyOwner({ email: "other@example.com", role: "admin", active: true }),
    false,
  );
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  assert.throws(() =>
    sameOrigin(
      new Request("http://localhost:3000/api", {
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() => sameOrigin(new Request("http://localhost:3000/api")));
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("http://localhost:3000/api", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
  );
});
test("Form ve dosya doğrulama", () => {
  assert.equal(
    listingInput.safeParse({ title: "x", price: -1 }).success,
    false,
  );
  assert.equal(imageKind(Buffer.from("<script>alert(1)</script>")), null);
  assert.equal(imageKind(Buffer.from([255, 216, 255, 0])), "jpg");
});
test("SQL migrations, foreign keys, favorites, photo constraints, Better Auth lifecycle", async () => {
  const pg = new PGlite();
  try {
    for (const file of (await readdir("db/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await pg.exec(await readFile(`db/migrations/${file}`, "utf8"));
    const database = drizzle(pg, { schema });
    process.env.BETTER_AUTH_SECRET =
      "test-only-secret-with-more-than-thirty-two-characters";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.ADMIN_EMAIL = "test@example.com";
    const auth = createAuthentication(database);
    await assert.rejects(() =>
      auth.api.signUpEmail({
        body: {
          name: "Test Kullanıcısı",
          email: "visitor@example.com",
          password: "StrongTestPassword42",
        },
      }),
    );
    const id = crypto.randomUUID();
    const [admin] = await database
      .insert(schema.user)
      .values({
        id,
        name: "Test Yönetici",
        email: "test@example.com",
        emailVerified: true,
        role: "admin",
      })
      .returning();
    await database.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: id,
      userId: id,
      providerId: "credential",
      password: await hashPassword("StrongTestPassword42"),
    });
    const signed = { user: admin };
    const [account] = await database
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, signed.user.id));
    assert.notEqual(account.password, "StrongTestPassword42");
    assert.ok(account.password && account.password.length > 20);
    const login = await auth.api.signInEmail({
      body: { email: "test@example.com", password: "StrongTestPassword42" },
      asResponse: true,
      headers: new Headers({ origin: "http://localhost:3000" }),
    });
    assert.equal(login.status, 200);
    const cookies = login.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const sess = await auth.api.getSession({
      headers: new Headers({ cookie: cookies }),
    });
    assert.equal(sess?.user.id, signed.user.id);
    await auth.api.signOut({
      headers: new Headers({
        cookie: cookies,
        origin: "http://localhost:3000",
      }),
    });
    assert.equal(
      await auth.api.getSession({ headers: new Headers({ cookie: cookies }) }),
      null,
    );
    await database
      .update(schema.user)
      .set({ active: false })
      .where(eq(schema.user.id, signed.user.id));
    await assert.rejects(() =>
      auth.api.signInEmail({
        body: { email: "test@example.com", password: "StrongTestPassword42" },
      }),
    );
    await database
      .update(schema.user)
      .set({ active: true })
      .where(eq(schema.user.id, signed.user.id));
    const token = crypto.randomUUID();
    await database.insert(schema.verification).values({
      id: crypto.randomUUID(),
      identifier: `reset-password:${token}`,
      value: signed.user.id,
      expiresAt: new Date(Date.now() + 60000),
    });
    await auth.api.resetPassword({
      body: { token, newPassword: "ChangedPassword42" },
    });
    await assert.rejects(() =>
      auth.api.signInEmail({
        body: { email: "test@example.com", password: "StrongTestPassword42" },
      }),
    );
    const changed = await auth.api.signInEmail({
      body: { email: "test@example.com", password: "ChangedPassword42" },
    });
    assert.ok(changed.token);
    await assert.rejects(() =>
      auth.api.resetPassword({
        body: { token, newPassword: "AnotherPassword42" },
      }),
    );
    const [city] = await database
      .insert(schema.cities)
      .values({ name: "Test İl", slug: "test-il" })
      .returning();
    const [district] = await database
      .insert(schema.districts)
      .values({ name: "Test İlçe", slug: "test-ilce", cityId: city.id })
      .returning();
    const [type] = await database
      .insert(schema.propertyTypes)
      .values({ name: "Daire", slug: "daire" })
      .returning();
    const [listing] = await database
      .insert(schema.listings)
      .values({
        slug: "test-listing",
        title: "Test ilan başlığı",
        description: "Test açıklama",
        price: "100",
        listingType: "satilik",
        propertyTypeId: type.id,
        cityId: city.id,
        districtId: district.id,
        address: "Test adres",
        roomCount: "3+1",
        areaM2: 100,
        heatingType: "Doğalgaz",
        userId: signed.user.id,
      })
      .returning();
    const [other] = await database
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Other admin",
        email: "other@example.com",
        role: "admin",
        emailVerified: true,
      })
      .returning();
    await database.insert(schema.listings).values({
      ...listing,
      id: crypto.randomUUID(),
      slug: "other-listing",
      userId: other.id,
      status: "published",
    });
    const changedByOther = await database
      .update(schema.listings)
      .set(publicationUpdate("published"))
      .where(ownedListing(listing.id, other.id))
      .returning();
    assert.equal(changedByOther.length, 0);
    const [live] = await database
      .update(schema.listings)
      .set(publicationUpdate("published"))
      .where(ownedListing(listing.id, signed.user.id))
      .returning();
    assert.equal(live.status, "published");
    assert.ok(live.publishedAt);
    const publicRows = await database
      .select()
      .from(schema.listings)
      .where(
        and(agencyListingsScope(), eq(schema.listings.status, "published")),
      );
    assert.deepEqual(
      publicRows.map((r) => r.id),
      [listing.id],
    );
    await database
      .update(schema.listings)
      .set(publicationUpdate("archived"))
      .where(ownedListing(listing.id, signed.user.id));
    assert.equal(
      (
        await database
          .select()
          .from(schema.listings)
          .where(
            and(agencyListingsScope(), eq(schema.listings.status, "published")),
          )
      ).length,
      0,
    );
    const [republished] = await database
      .update(schema.listings)
      .set(publicationUpdate("published"))
      .where(ownedListing(listing.id, signed.user.id))
      .returning();
    assert.equal(
      republished.publishedAt?.getTime(),
      live.publishedAt?.getTime(),
    );
    await database
      .insert(schema.account)
      .values({
        id: crypto.randomUUID(),
        accountId: other.id,
        userId: other.id,
        providerId: "credential",
        password: await hashPassword("OtherStrongPassword42"),
      });
    await assert.rejects(() =>
      auth.api.signInEmail({
        body: { email: "other@example.com", password: "OtherStrongPassword42" },
      }),
    );
    const visible = await database
      .select()
      .from(schema.listings)
      .where(agencyListingsScope());
    assert.deepEqual(
      visible.map((r) => r.id),
      [listing.id],
    );
    delete process.env.ADMIN_EMAIL;
    assert.equal(
      (
        await database
          .select()
          .from(schema.listings)
          .where(agencyListingsScope())
      ).length,
      0,
    );
    process.env.ADMIN_EMAIL = "test@example.com";
    await database
      .insert(schema.favorites)
      .values({ userId: signed.user.id, listingId: listing.id });
    await assert.rejects(() =>
      database
        .insert(schema.favorites)
        .values({ userId: signed.user.id, listingId: listing.id }),
    );
    await database.insert(schema.listingImages).values({
      listingId: listing.id,
      imageUrl: "https://res.cloudinary.com/test/image/upload/a.jpg",
      storageKey: "test/a",
      altText: "Test",
      isPrimary: true,
    });
    await assert.rejects(() =>
      database.insert(schema.listingImages).values({
        listingId: listing.id,
        imageUrl: "https://res.cloudinary.com/test/image/upload/b.jpg",
        storageKey: "test/b",
        altText: "Test",
        isPrimary: true,
      }),
    );
    await assert.rejects(() =>
      database.delete(schema.cities).where(eq(schema.cities.id, city.id)),
    );
    await database
      .delete(schema.listings)
      .where(eq(schema.listings.id, listing.id));
    assert.equal((await database.select().from(schema.favorites)).length, 0);
    assert.equal(
      (await database.select().from(schema.listingImages)).length,
      0,
    );
  } finally {
    await pg.close();
  }
});
