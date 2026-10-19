import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { discoveryCities } from "@/lib/regions";
import { MapPin } from "lucide-react";
import { locations, publishedListingCities } from "@/lib/queries";
import { ServiceUnavailable } from "@/components/ui";
export const dynamic = "force-dynamic";
const baseMetadata = {
  title: "Bölgeler",
  alternates: { canonical: "/bolgeler" },
};
export async function generateMetadata() {
  const { tr } = await getTranslations();
  return { ...baseMetadata, title: tr("Bölgeler") };
}
export default async function Regions({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { tr } = await getTranslations();
  if (!process.env.DATABASE_URL) return <ServiceUnavailable />;
  const [data, listingCities] = await Promise.all([
    locations(),
    publishedListingCities(),
  ]);
  const listingCounts = new Map(
    listingCities.map((city) => [city.id, city.listingCount]),
  );
  const { city: cityId } = await searchParams;
  const selected = data.cities.find((c) => c.id === cityId);
  return (
    <div className="wrap regions-page">
      <div className="page-intro">
        <span className="eyebrow">{tr("KONUMUNUZU SEÇİN")}</span>
        <h1>
          {selected
            ? tr("{city} ilçeleri", { city: selected.name })
            : tr("İlleri keşfedin.")}
        </h1>
        <p className="quiet">
          {selected
            ? tr(
                "{count} aktif ilan var. İlçeyi seçerek bölgedeki ilanları görüntüleyin.",
                { count: listingCounts.get(selected.id) ?? 0 },
              )
            : tr(
                "Karadeniz’den başlayın, Türkiye’nin 81 ilini keşfedin. Bir il seçerek ilçelerine ulaşabilirsiniz.",
              )}
        </p>
      </div>
      {selected && (
        <Link className="text-link" href="/bolgeler">
          {tr("← Bütün iller")}{" "}
        </Link>
      )}
      <div className="region-cards">
        {!selected &&
          discoveryCities(data.cities).map((city) => (
            <Link
              key={city.id}
              href={`/bolgeler?city=${city.id}`}
              className="region-card"
            >
              <MapPin size={22} />
              <div>
                <strong>{city.name}</strong>
                <span>
                  {tr("{count} aktif ilan", {
                    count: listingCounts.get(city.id) ?? 0,
                  })}
                </span>
              </div>
            </Link>
          ))}
        {(selected
          ? data.districts.filter((d) => d.cityId === selected.id)
          : []
        ).map((district) => (
          <Link
            key={district.id}
            href={`/ilanlar?district=${district.id}`}
            className="region-card"
          >
            <MapPin size={22} />
            <div>
              <strong>{district.name}</strong>
              <span>
                {data.cities.find((city) => city.id === district.cityId)?.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!data.districts.length && (
        <p className="quiet">{tr("Henüz bölge eklenmemiş.")}</p>
      )}
    </div>
  );
}
