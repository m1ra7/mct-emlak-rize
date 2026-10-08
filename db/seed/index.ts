import { importTurkeyLocations } from "../../lib/location-import";
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { db } from "../../db";
import {
  cities,
  districts,
  propertyTypes,
  listings,
  user,
} from "../../db/schema";
import { and, eq } from "drizzle-orm";
async function main() {
  const d = db();
  const counts = await importTurkeyLocations(d);
  console.log(
    `${counts.addedCities} il, ${counts.addedDistricts} ilçe ve ${counts.addedNeighborhoods} mahalle eklendi.`,
  );
  const [rize] = await d.select().from(cities).where(eq(cities.name, "Rize"));
  for (const [name, slug] of [
    ["Daire", "daire"],
    ["Villa", "villa"],
    ["Müstakil Ev", "mustakil-ev"],
    ["Arsa", "arsa"],
    ["İş Yeri", "is-yeri"],
    ["Diğer", "diger"],
  ])
    await d
      .insert(propertyTypes)
      .values({ name, slug, allowRent: slug !== "arsa" })
      .onConflictDoNothing();
  if (process.env.SEED_DEMO === "true") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Production ortamında demo seed kapalıdır.");
    const [owner] = await d
      .select()
      .from(user)
      .where(eq(user.email, process.env.ADMIN_EMAIL || ""));
    if (!owner) throw new Error("Demo seed için önce admin hesabı oluşturun.");
    const [district] = await d
      .select()
      .from(districts)
      .where(and(eq(districts.slug, "merkez"), eq(districts.cityId, rize.id)));
    const [type] = await d
      .select()
      .from(propertyTypes)
      .where(eq(propertyTypes.slug, "daire"));
    for (let n = 1; n <= 3; n++)
      await d
        .insert(listings)
        .values({
          slug: `ornek-ilan-${n}`,
          title: `ÖRNEK İLAN — Rize Merkez ${n}`,
          description:
            "Bu kayıt geliştirme ve test amacıyla eklenmiştir. Gerçek bir emlak ilanı değildir.",
          price: String(3000000 + n * 250000),
          listingType: "satilik",
          propertyTypeId: type.id,
          cityId: rize.id,
          districtId: district.id,
          address: "Örnek adres — gerçek ilan değildir",
          roomCount: "3+1",
          areaM2: 120,
          heatingType: "Doğalgaz",
          userId: owner.id,
          status: "draft",
        })
        .onConflictDoNothing();
  }
  console.log(
    "Konum ve kategori seed tamamlandı. Mahalleler doğrulanmış bilgilerle yönetim panelinden eklenir.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
