"use client";
import { useTranslations } from "@/components/locale-provider";
import Link from "next/link";
import { discoveryCities, featuredRegionSlugs } from "@/lib/regions";
import { Search, SlidersHorizontal } from "lucide-react";
import type { locations } from "@/lib/queries";
export function HomeSearch({
  data,
}: {
  data: Awaited<ReturnType<typeof locations>>;
}) {
  const { tr } = useTranslations();
  const type = "satilik";
  return (
    <div className="home-search">
      <div className="search-tabs" role="group" aria-label={tr("İlan türü")}>
        <Link href="/satilik">{tr("Satılık ilanlar")}</Link>
        <Link href="/kiralik">{tr("Kiralık ilanlar")}</Link>
        <span>{tr("YENİ ADRESİNİZİ BULUN")}</span>
      </div>
      <form action="/ilanlar" className="hero-search-form">
        <input type="hidden" name="type" value={type} />
        <label>
          {tr("Gayrimenkul")}{" "}
          <select name="property">
            <option value="">{tr("Tüm türler")}</option>
            {data.types
              .filter((t) => (type === "satilik" ? t.allowSale : t.allowRent))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {tr(t.name)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {tr("Şehir")}{" "}
          <select name="city" defaultValue="">
            <option value="">{tr("Türkiye · Tüm iller")}</option>
            <optgroup label={tr("Karadeniz’den keşfedin")}>
              {discoveryCities(data.cities)
                .filter((c) => featuredRegionSlugs.includes(c.slug))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label={tr("Diğer iller")}>
              {discoveryCities(data.cities)
                .filter((c) => !featuredRegionSlugs.includes(c.slug))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
        <label>
          {tr("Bütçeniz")}{" "}
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="1"
            placeholder={tr("Üst sınır (₺)")}
          />
        </label>
        <button className="button" type="submit">
          <Search size={19} />
          {tr("İlanları keşfet")}{" "}
        </button>
      </form>
      <div className="search-bottom">
        <span>{tr("Ev, arsa veya iş yeri. Seçim sizin.")}</span>
        <Link href="/ilanlar">
          <SlidersHorizontal size={15} />
          {tr("Gelişmiş arama")}{" "}
        </Link>
      </div>
    </div>
  );
}
