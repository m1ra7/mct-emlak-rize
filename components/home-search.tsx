"use client";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import type { locations } from "@/lib/queries";
export function HomeSearch({
  data,
}: {
  data: Awaited<ReturnType<typeof locations>>;
}) {
  const type = "satilik";
  return (
    <div className="home-search">
      <div className="search-tabs" role="group" aria-label="İlan türü">
        <Link href="/satilik">Satılık ilanlar</Link>
        <Link href="/kiralik">Kiralık ilanlar</Link>
        <span>YENİ ADRESİNİZİ BULUN</span>
      </div>
      <form action="/ilanlar" className="hero-search-form">
        <input type="hidden" name="type" value={type} />
        <label>
          Gayrimenkul
          <select name="property">
            <option value="">Tüm türler</option>
            {data.types
              .filter((t) => (type === "satilik" ? t.allowSale : t.allowRent))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Konum
          <select name="district">
            <option value="">Tüm ilçeler</option>
            {data.districts
              .filter(
                (d) =>
                  data.cities.find((c) => c.id === d.cityId)?.slug === "rize",
              )
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Bütçeniz
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="1"
            placeholder="Üst sınır (₺)"
          />
        </label>
        <button className="button" type="submit">
          <Search size={19} />
          İlanları keşfet
        </button>
      </form>
      <div className="search-bottom">
        <span>Ev, arsa veya iş yeri. Seçim sizin.</span>
        <Link href="/ilanlar">
          <SlidersHorizontal size={15} />
          Gelişmiş arama
        </Link>
      </div>
    </div>
  );
}
