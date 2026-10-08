"use client";
import { useNeighborhoods } from "./use-neighborhoods";
import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import type { locations, SearchParams } from "@/lib/queries";
type Data = Awaited<ReturnType<typeof locations>>;
export function Filters({
  data,
  p = {},
  compact = false,
}: {
  data: Data;
  p?: SearchParams;
  compact?: boolean;
}) {
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const [city, setCity] = useState(get("city"));
  const [district, setDistrict] = useState(get("district"));
  const neighborhoodOptions = useNeighborhoods(district, data.neighborhoods);
  const [neighborhood, setNeighborhood] = useState(get("neighborhood"));
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(get("type"));
  const [property, setProperty] = useState(get("property"));
  const fields = (
    <>
      <div className="field">
        <label htmlFor={compact ? "h-q" : "q"}>Ne arıyorsunuz?</label>
        <input
          id={compact ? "h-q" : "q"}
          name="q"
          defaultValue={get("q")}
          placeholder="İlan başlığı, açıklama"
        />
      </div>
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}type`}>İlan türü</label>
        <select
          id={`${compact ? "h-" : ""}type`}
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setProperty("");
          }}
        >
          <option value="">Satılık ve kiralık</option>
          <option value="satilik">Satılık</option>
          <option value="kiralik">Kiralık</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}property`}>
          Gayrimenkul türü
        </label>
        <select
          id={`${compact ? "h-" : ""}property`}
          name="property"
          value={property}
          onChange={(e) => setProperty(e.target.value)}
        >
          <option value="">Tüm türler</option>
          {data.types
            .filter((t) =>
              type === "satilik"
                ? t.allowSale
                : type === "kiralik"
                  ? t.allowRent
                  : true,
            )
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}city`}>İl</label>
        <select
          id={`${compact ? "h-" : ""}city`}
          name="city"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setDistrict("");
            setNeighborhood("");
          }}
        >
          <option value="">Tüm iller</option>
          {data.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}district`}>İlçe</label>
        <select
          id={`${compact ? "h-" : ""}district`}
          name="district"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setNeighborhood("");
          }}
        >
          <option value="">Tüm ilçeler</option>
          {data.districts
            .filter((d) => !city || d.cityId === city)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </div>
      {neighborhoodOptions.error && (
        <p role="alert">{neighborhoodOptions.error}</p>
      )}
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}neighborhood`}>Mahalle</label>
        <select
          id={`${compact ? "h-" : ""}neighborhood`}
          name="neighborhood"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
        >
          <option value="">Tüm mahalleler</option>
          {neighborhoodOptions.rows
            .filter((n) => n.districtId === district)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${compact ? "h-" : ""}rooms`}>Oda sayısı</label>
        <select
          id={`${compact ? "h-" : ""}rooms`}
          name="rooms"
          defaultValue={get("rooms")}
        >
          <option value="">Tümü</option>
          {["1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "6+1"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
    </>
  );
  const numbers = [
    ["minPrice", "Min. fiyat (TL)"],
    ["maxPrice", "Maks. fiyat (TL)"],
    ["minArea", "Min. m²"],
    ["maxArea", "Maks. m²"],
    ["maxAge", "Maks. bina yaşı"],
    ["floor", "Kat"],
  ];
  return (
    <>
      <button
        type="button"
        className="button secondary filter-toggle"
        aria-expanded={open}
        aria-controls="portfolio-filter-panel"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={18} />
        {open ? "Gelişmiş aramayı kapat" : "Gelişmiş arama"}
      </button>
      {(compact || open) && (
        <form
          action="/ilanlar"
          method="GET"
          id="portfolio-filter-panel"
          className={compact ? "" : `panel filter-panel ${open ? "open" : ""}`}
        >
          <div className={compact ? "fields four" : ""}>
            {fields}
            {(compact ? numbers.slice(0, 2) : numbers).map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={`${compact ? "h-" : ""}${k}`}>{label}</label>
                <input
                  id={`${compact ? "h-" : ""}${k}`}
                  name={k}
                  type="number"
                  min={k === "floor" ? -10 : 0}
                  defaultValue={get(k)}
                  step="1"
                />
              </div>
            ))}
            {!compact && (
              <>
                <div className="field">
                  <label htmlFor={`${compact ? "h-" : ""}heating`}>
                    Isıtma
                  </label>
                  <select
                    id={`${compact ? "h-" : ""}heating`}
                    name="heating"
                    defaultValue={get("heating")}
                  >
                    <option value="">Tümü</option>
                    {["Doğalgaz", "Merkezi", "Klima", "Soba", "Yok"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </div>
                {[
                  ["balcony", "Balkon"],
                  ["elevator", "Asansör"],
                  ["parking", "Otopark"],
                  ["furnished", "Eşyalı"],
                  ["complex", "Site içerisinde"],
                  ["seaView", "Deniz manzarası"],
                ].map(([key, label]) => (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      name={key}
                      value="true"
                      defaultChecked={get(key) === "true"}
                    />
                    {label}
                  </label>
                ))}
                <div className="field" style={{ marginTop: 20 }}>
                  <label htmlFor={`${compact ? "h-" : ""}sort`}>Sıralama</label>
                  <select
                    id={`${compact ? "h-" : ""}sort`}
                    name="sort"
                    defaultValue={get("sort") || "newest"}
                  >
                    <option value="newest">En yeni</option>
                    <option value="oldest">En eski</option>
                    <option value="priceAsc">Fiyat düşükten yükseğe</option>
                    <option value="priceDesc">Fiyat yüksekten düşüğe</option>
                    <option value="areaAsc">m² küçükten büyüğe</option>
                    <option value="areaDesc">m² büyükten küçüğe</option>
                  </select>
                </div>
              </>
            )}
            <div className="field" style={{ alignSelf: "end" }}>
              <button
                className="button"
                style={{ width: "100%" }}
                type="submit"
              >
                {compact ? "İlanları bul" : "Sonuçları göster"}
              </button>
              {!compact && (
                <Link
                  href="/ilanlar"
                  className="quiet"
                  style={{
                    display: "block",
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  {open ? "Gelişmiş aramayı kapat" : "Gelişmiş arama"}i temizle
                </Link>
              )}
            </div>
          </div>
          {open && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(false)}
            >
              Kapat
            </button>
          )}
        </form>
      )}
    </>
  );
}
