import { deleteLocation } from "../lib/location-delete";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { listingInput } from "../lib/validation";
import { queryListings } from "../lib/queries";
import { saveListing } from "../lib/listing-save";
import { apiError, jsonBody } from "../lib/security";

test("İlan formu → JSON → doğrulama → veritabanı: yayınla, düzenle, hatalı alanlar", async () => {
  const pg = new PGlite();
  try {
    for (const file of (await readdir("db/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await pg.exec(await readFile(`db/migrations/${file}`, "utf8"));
    const database = drizzle(pg, { schema });
    const [owner] = await database
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "MCT",
        email: "owner@example.com",
        role: "admin",
        emailVerified: true,
      })
      .returning();
    const [city] = await database
      .insert(schema.cities)
      .values({ name: "Rize", slug: "rize" })
      .returning();
    const [district] = await database
      .insert(schema.districts)
      .values({ name: "Merkez", slug: "merkez", cityId: city.id })
      .returning();
    const [type] = await database
      .insert(schema.propertyTypes)
      .values({ name: "Daire", slug: "daire" })
      .returning();
    const form = {
      title: "Rize Merkez Satılık Daire",
      description: "Rize merkezde, deniz manzaralı geniş bir daire.",
      price: "3.250.000,50",
      listingType: "satilik",
      cityId: city.id,
      districtId: district.id,
      propertyTypeId: type.id,
      neighborhoodId: "",
      address: "Merkez mahallesi test adresi",
      latitude: "",
      longitude: "",
      roomCount: "3+1",
      areaM2: "120",
      buildingAge: "0",
      floor: "0",
      totalFloors: "1",
      heatingType: "Doğalgaz",
      bathroomCount: "1",
      balcony: false,
      elevator: false,
      parking: false,
      furnished: false,
      complex: false,
      seaView: true,
      features: [{ name: "Cephe", value: "Güney" }],
    };
    const req = new Request("http://localhost/api/manage/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const parsed = listingInput.parse(await jsonBody(req));
    const saved = await saveListing(database, owner, parsed);
    assert.equal(saved.status, "published");
    for (const [kind, id] of [
      ["city", city.id],
      ["district", district.id],
      ["property", type.id],
    ]) {
      await assert.rejects(
        () => deleteLocation(database, kind, id),
        (error: unknown) => (error as { status: number }).status === 409,
      );
    }
    const [extraCity] = await database
      .insert(schema.cities)
      .values({ name: "Test il", slug: "test-il" })
      .returning();
    const [extraDistrict] = await database
      .insert(schema.districts)
      .values({ name: "Test ilçe", slug: "test-ilce", cityId: extraCity.id })
      .returning();
    const [extraNeighborhood] = await database
      .insert(schema.neighborhoods)
      .values({ name: "Test mahalle", districtId: extraDistrict.id })
      .returning();
    await assert.rejects(
      () => deleteLocation(database, "city", extraCity.id),
      (error: unknown) => (error as { status: number }).status === 409,
    );
    await assert.rejects(
      () => deleteLocation(database, "district", extraDistrict.id),
      (error: unknown) => (error as { status: number }).status === 409,
    );
    await deleteLocation(database, "neighborhood", extraNeighborhood.id);
    await deleteLocation(database, "district", extraDistrict.id);
    await deleteLocation(database, "city", extraCity.id);
    await assert.rejects(
      () => deleteLocation(database, "city", extraCity.id),
      (error: unknown) => (error as { status: number }).status === 404,
    );
    const [extraType] = await database
      .insert(schema.propertyTypes)
      .values({ name: "Test tür", slug: "test-tur" })
      .returning();
    await deleteLocation(database, "property", extraType.id);
    assert.equal((await database.select().from(schema.cities)).length, 1);
    assert.equal(Number(saved.price), 3250000.5);
    assert.equal(saved.latitude, null);
    assert.equal(saved.neighborhoodId, null);
    assert.equal(saved.userId, owner.id);
    assert.ok(saved.publishedAt);
    assert.equal(
      (await database.select().from(schema.listingFeatures)).length,
      1,
    );
    const updated = await saveListing(
      database,
      owner,
      listingInput.parse({
        ...form,
        price: "3250000",
        features: [],
        status: "published",
        latitude: "41.0255123",
        longitude: "40.5177123",
      }),
      saved.id,
    );
    assert.equal(Number(updated.price), 3250000);
    assert.equal(Number(updated.latitude), 41.0255123);
    assert.equal(Number(updated.longitude), 40.5177123);
    assert.equal(updated.publishedAt?.getTime(), saved.publishedAt?.getTime());
    assert.equal(
      (await database.select().from(schema.listingFeatures)).length,
      0,
    );
    for (const invalid of [
      { title: "          " },
      { price: "" },
      { price: "yanlış" },
      { floor: "3" },
      { latitude: "41" },
      { areaM2: "1.5" },
    ]) {
      const result = listingInput.safeParse({ ...form, ...invalid });
      assert.equal(result.success, false);
      if (!result.success) {
        const response = apiError(result.error);
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.ok(body.fieldErrors[Object.keys(invalid)[0]]);
        assert.notEqual(body.error, "Alanları kontrol edin.");
      }
    }
    await assert.rejects(
      () =>
        saveListing(database, owner, {
          ...parsed,
          cityId: crypto.randomUUID(),
        }),
      /İl ve ilçe/,
    );
    await assert.rejects(
      () =>
        saveListing(
          database,
          { id: "someone-else", role: "admin" },
          parsed,
          saved.id,
        ),
      /yetkiniz yok/,
    );
    assert.equal((await database.select().from(schema.listings)).length, 1);
    process.env.ADMIN_EMAIL = owner.email;
    const rental = await saveListing(database, owner, {
      ...parsed,
      title: "Rize kiralık daire",
      listingType: "kiralik",
    });
    await saveListing(database, owner, { ...parsed, status: "draft" });
    const sales = await queryListings(database, { type: "satilik" });
    const rentals = await queryListings(database, { type: "kiralik" });
    assert.equal(sales.total, 1);
    assert.deepEqual(
      sales.items.map((item) => item.listing.id),
      [saved.id],
    );
    assert.equal(rentals.total, 1);
    assert.deepEqual(
      rentals.items.map((item) => item.listing.id),
      [rental.id],
    );
    assert.equal((await queryListings(database, {})).total, 2);
    const [landType] = await database
      .insert(schema.propertyTypes)
      .values({ name: "Arsa", slug: "arsa" })
      .returning();
    const landForm: Record<string, unknown> = {
      ...form,
      propertyTypeId: landType.id,
      isLand: true,
      price: 0,
      features: [
        { name: "İmar durumu", value: "Konut imarlı" },
        { name: "Kat karşılığı", value: "Evet" },
        { name: "Pazarlık", value: "Pazarlık yapılabilir" },
      ],
    };
    for (const key of [
      "roomCount",
      "buildingAge",
      "floor",
      "totalFloors",
      "heatingType",
      "bathroomCount",
    ])
      delete landForm[key];
    const land = await saveListing(
      database,
      owner,
      listingInput.parse(landForm),
    );
    assert.equal(Number(land.price), 1);
    const listedLand = (await queryListings(database, {})).items.find(
      (item) => item.listing.id === land.id,
    );
    assert.equal(listedLand?.landExchange, true);
    assert.equal(listingInput.safeParse({ ...form, price: 0 }).success, false);
    assert.equal(
      listingInput.safeParse({ ...landForm, features: [], price: 0 }).success,
      false,
    );
    assert.equal(land.roomCount, "Uygulanmaz");
    assert.equal(land.bathroomCount, 0);
    await assert.rejects(
      () =>
        saveListing(
          database,
          owner,
          listingInput.parse({ ...landForm, propertyTypeId: type.id }),
        ),
      /eşleşmiyor/,
    );
    assert.equal(
      listingInput.safeParse({ ...landForm, isLand: false }).success,
      false,
    );
    const apartmentFeatures = [
      { name: "Tapu Durumu", value: "Kat mülkiyeti" },
      { name: "Kullanım Durumu", value: "Boş" },
      { name: "Net Alan", value: "100" },
      {
        name: "İç Özellikler",
        value: JSON.stringify(["Fiber", "Ebeveyn Banyo"]),
      },
      { name: "Dış Özellikler", value: JSON.stringify(["Bahçe", "Güvenlik"]) },
    ];
    const apartment = await saveListing(
      database,
      owner,
      listingInput.parse({
        ...parsed,
        features: apartmentFeatures,
        complex: true,
      }),
    );
    assert.equal(apartment.complex, true);
    const storedFeatures = (
      await database.select().from(schema.listingFeatures)
    ).filter((f) => f.listingId === apartment.id);
    assert.equal(
      storedFeatures.find((f) => f.name === "Net Alan")?.value,
      "100",
    );
    assert.deepEqual(
      JSON.parse(storedFeatures.find((f) => f.name === "İç Özellikler")!.value),
      ["Fiber", "Ebeveyn Banyo"],
    );
    const wcInput = listingInput.parse({
      ...parsed,
      listingType: "kiralik",
      features: [{ name: "WC Sayısı", value: "2" }],
    });
    const withWc = await saveListing(database, owner, wcInput);
    assert.equal(
      (await database.select().from(schema.listingFeatures)).find(
        (f) => f.listingId === withWc.id && f.name === "WC Sayısı",
      )?.value,
      "2",
    );
    await saveListing(database, owner, { ...wcInput, features: [] }, withWc.id);
    assert.equal(
      (await database.select().from(schema.listingFeatures)).some(
        (f) => f.listingId === withWc.id && f.name === "WC Sayısı",
      ),
      false,
    );
    await assert.rejects(
      () =>
        saveListing(database, owner, { ...wcInput, listingType: "satilik" }),
      /yalnızca kiralık dairelerde/,
    );
    for (const value of ["-1", "1.5", "101", "abc"])
      assert.equal(
        listingInput.safeParse({
          ...wcInput,
          features: [{ name: "WC Sayısı", value }],
        }).success,
        false,
      );
    const noArea = await saveListing(
      database,
      owner,
      listingInput.parse({
        ...parsed,
        areaM2: "",
        features: [{ name: "Net Alan", value: "Belirtilmemiş" }],
      }),
    );
    assert.equal(noArea.areaM2, null);
    const clearedArea = await saveListing(
      database,
      owner,
      listingInput.parse({ ...parsed, areaM2: "", features: [] }),
      saved.id,
    );
    assert.equal(clearedArea.areaM2, null);
    assert.equal(
      listingInput.safeParse({ ...parsed, areaM2: 0 }).success,
      false,
    );
  } finally {
    await pg.close();
  }
});
