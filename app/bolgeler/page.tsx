import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { locations } from "@/lib/queries";
import { ServiceUnavailable } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bölgeler",
  alternates: { canonical: "/bolgeler" },
};
export default async function Regions({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  if (!process.env.DATABASE_URL) return <ServiceUnavailable />;
  const data = await locations();
  const { city: cityId } = await searchParams;
  const selected = data.cities.find((c) => c.id === cityId);
  return (
    <div className="wrap regions-page">
      <div className="page-intro">
        <span className="eyebrow">KONUMUNUZU SEÇİN</span>
        <h1>{selected ? `${selected.name} ilçeleri` : "İlleri keşfedin."}</h1>
        <p className="quiet">
          {selected
            ? "İlçeyi seçerek bölgedeki ilanları görüntüleyin."
            : "Önce bir il seçin; ardından ilçelerini keşfedin."}
        </p>
      </div>
      {selected && (
        <Link className="text-link" href="/bolgeler">
          ← Bütün iller
        </Link>
      )}
      <div className="region-cards">
        {!selected &&
          data.cities.map((city) => (
            <Link
              key={city.id}
              href={`/bolgeler?city=${city.id}`}
              className="region-card"
            >
              <MapPin size={22} />
              <div>
                <strong>{city.name}</strong>
                <span>İlçeleri keşfet</span>
              </div>
              <ArrowUpRight size={20} />
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
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
      {!data.districts.length && (
        <p className="quiet">Henüz bölge eklenmemiş.</p>
      )}
    </div>
  );
}
