"use client";
import { useNeighborhoods } from "./use-neighborhoods";
import {
  isLandType,
  isRentalApartment,
  landFields,
  zoningOptions,
} from "@/lib/property-kind";
import { PropertyTags } from "./property-tags";
import { AddressLocation } from "./address-location";
import { listingInput } from "@/lib/validation";
import { validationErrors } from "@/lib/validation-errors";
import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { locations } from "@/lib/queries";
import type { listings, listingImages, listingFeatures } from "@/db/schema";
import { request } from "./widgets";
type Listing = typeof listings.$inferSelect;
type Img = typeof listingImages.$inferSelect;
type Feature = typeof listingFeatures.$inferSelect;
export function ListingForm({
  data,
  listing,
  admin = true,
  features = [],
}: {
  data: Awaited<ReturnType<typeof locations>>;
  listing?: Listing;
  admin?: boolean;
  features?: Feature[];
}) {
  const router = useRouter();
  const [city, setCity] = useState(
    listing?.cityId || data.cities.find((c) => c.slug === "rize")?.id || "",
  );
  const [district, setDistrict] = useState(listing?.districtId || "");
  const [neighborhood, setNeighborhood] = useState(
    listing?.neighborhoodId || "",
  );
  const neighborhoodOptions = useNeighborhoods(district, data.neighborhoods);
  const [type, setType] = useState(listing?.listingType || "satilik");
  const [property, setProperty] = useState(listing?.propertyTypeId || "");
  const land = isLandType(data.types.find((t) => t.id === property));
  const rentalApartment = isRentalApartment(
    type,
    data.types.find((t) => t.id === property),
  );
  const meta = (name: string) => features.find((f) => f.name === name)?.value;
  const initialTags = (name: string): string[] => {
    try {
      const value = JSON.parse(meta(name) || "[]");
      return Array.isArray(value)
        ? value.filter((x) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  };
  const [exchange, setExchange] = useState(meta("Kat karşılığı") === "Evet");
  const [publication, setPublication] = useState(
    listing?.status === "pending" ? "draft" : listing?.status || "published",
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const createdId = useRef(listing?.id || "");
  const uploadedFiles = useRef(new Set<File>());
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoProgress, setPhotoProgress] = useState("");
  const base = "/admin/listings";
  const numbers = [
    [
      "price",
      "Fiyat (TL)",
      meta("Kat karşılığı") === "Evet" ? undefined : listing?.price,
      1,
    ],
    ["areaM2", land ? "Alan (m²)" : "Brüt alan (m²)", listing?.areaM2, 1],
    ["buildingAge", "Bina yaşı", listing?.buildingAge ?? 0, 0],
    ["floor", "Bulunduğu kat", listing?.floor ?? 0, -10],
    ["totalFloors", "Toplam kat", listing?.totalFloors ?? 1, 1],
    ["bathroomCount", "Banyo sayısı", listing?.bathroomCount ?? 1, 0],
  ] as const;
  return (
    <form
      className="panel listing-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (locationBusy) {
          setError("Adres araması sürüyor. Konum bulunduktan sonra kaydedin.");
          return;
        }
        setBusy(true);
        setError("");
        setFieldErrors({});
        const form = e.currentTarget;
        const f = new FormData(form);
        const payload: Record<string, unknown> = Object.fromEntries(f);
        for (const [k] of numbers) payload[k] = f.get(k);
        for (const k of [
          "balcony",
          "elevator",
          "parking",
          "furnished",
          "complex",
          "seaView",
          "featured",
        ])
          payload[k] = f.get(k) === "on";
        payload.latitude = f.get("latitude") || null;
        payload.longitude = f.get("longitude") || null;
        payload.neighborhoodId = f.get("neighborhoodId") || null;
        payload.features = String(f.get("features") || "")
          .split("\n")
          .filter((l) => l.trim())
          .map((line) => {
            const i = line.indexOf(":");
            return {
              name: i >= 0 ? line.slice(0, i).trim() : line.trim(),
              value: i >= 0 ? line.slice(i + 1).trim() || "Var" : "Var",
            };
          });
        payload.isLand = land;
        if (land) for (const key of landFields) delete payload[key];
        const metadata = [
          {
            name: "Pazarlık",
            value: String(f.get("negotiable") || "Belirtilmemiş"),
          },
          ...(land
            ? [
                {
                  name: "İmar durumu",
                  value: String(f.get("zoning") || "Belirtilmemiş"),
                },
                {
                  name: "Kat karşılığı",
                  value: f.get("landExchange") === "on" ? "Evet" : "Hayır",
                },
              ]
            : []),
        ];
        payload.features = [
          ...(payload.features as { name: string; value: string }[]).filter(
            (x) =>
              ![
                "Pazarlık",
                "İmar durumu",
                "Kat karşılığı",
                "Tapu Durumu",
                "Kullanım Durumu",
                "Net Alan",
                "İç Özellikler",
                "Dış Özellikler",
                "WC Sayısı",
              ].includes(x.name),
          ),
          ...metadata,
          ...(rentalApartment && String(f.get("wcCount") || "").trim() !== ""
            ? [{ name: "WC Sayısı", value: String(f.get("wcCount")) }]
            : []),
          ...(!land
            ? [
                {
                  name: "Tapu Durumu",
                  value: String(f.get("deedStatus") || "Belirtilmemiş"),
                },
                {
                  name: "Kullanım Durumu",
                  value: String(f.get("occupancy") || "Belirtilmemiş"),
                },
                {
                  name: "Net Alan",
                  value: String(f.get("netArea") || "Belirtilmemiş"),
                },
                {
                  name: "İç Özellikler",
                  value: String(f.get("interiorTags") || "[]"),
                },
                {
                  name: "Dış Özellikler",
                  value: String(f.get("exteriorTags") || "[]"),
                },
              ]
            : []),
        ];
        try {
          const result = listingInput.safeParse(payload);
          if (!result.success) {
            const errors = validationErrors(result.error);
            setFieldErrors(errors);
            const first = form.elements.namedItem(Object.keys(errors)[0]);
            if (first instanceof HTMLElement) first.focus();
            throw new Error(Object.values(errors).join(" "));
          }
          const r = await request(
            `listings${createdId.current ? "/" + createdId.current : ""}`,
            createdId.current ? "PATCH" : "POST",
            result.data,
          );
          createdId.current = r.listing.id;
          setCreated(true);
          for (const file of newPhotos) {
            if (uploadedFiles.current.has(file)) continue;
            setPhotoProgress(
              `${uploadedFiles.current.size + 1} / ${newPhotos.length} fotoğraf yükleniyor…`,
            );
            const data = new FormData();
            data.set("file", file);
            await request(`images/${r.listing.id}`, "POST", data);
            uploadedFiles.current.add(file);
          }
          setPhotoProgress("");
          router.push(
            publication === "published"
              ? "/admin?published=true"
              : `${base}/${r.listing.id}?saved=true`,
          );
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="fields">
        {error && (
          <div id="listing-form-error" className="alert span" role="alert">
            {error}
          </div>
        )}
        <div className="field span">
          <label htmlFor="title">İlan başlığı</label>
          <input
            id="title"
            name="title"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={
              fieldErrors.title ? "listing-form-error" : undefined
            }
            required
            minLength={10}
            maxLength={180}
            defaultValue={listing?.title}
          />
        </div>
        <div className="field">
          <label>
            İlan türü
            <select
              name="listingType"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setProperty("");
              }}
            >
              <option value="satilik">Satılık</option>
              <option value="kiralik">Kiralık</option>
            </select>
          </label>
        </div>
        <div className="field">
          <label>
            Gayrimenkul türü
            <select
              name="propertyTypeId"
              aria-invalid={Boolean(fieldErrors.propertyTypeId)}
              aria-describedby={
                fieldErrors.propertyTypeId ? "listing-form-error" : undefined
              }
              required
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            >
              <option value="">Seçiniz</option>
              {data.types
                .filter((t) => (type === "satilik" ? t.allowSale : t.allowRent))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="field">
          <label>
            İl
            <select
              name="cityId"
              aria-invalid={Boolean(fieldErrors.cityId)}
              aria-describedby={
                fieldErrors.cityId ? "listing-form-error" : undefined
              }
              required
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
                setNeighborhood("");
              }}
            >
              <option value="">Seçiniz</option>
              {data.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="field">
          <label>
            İlçe
            <select
              name="districtId"
              aria-invalid={Boolean(fieldErrors.districtId)}
              aria-describedby={
                fieldErrors.districtId ? "listing-form-error" : undefined
              }
              required
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setNeighborhood("");
              }}
            >
              <option value="">Seçiniz</option>
              {data.districts
                .filter((d) => d.cityId === city)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {neighborhoodOptions.error && (
          <p role="alert">{neighborhoodOptions.error}</p>
        )}
        <div className="field">
          <label>
            Mahalle
            <select
              name="neighborhoodId"
              aria-invalid={Boolean(fieldErrors.neighborhoodId)}
              aria-describedby={
                fieldErrors.neighborhoodId ? "listing-form-error" : undefined
              }
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            >
              <option value="">Belirtilmemiş</option>
              {neighborhoodOptions.rows
                .filter((n) => n.districtId === district)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!land && (
          <div className="field">
            <label>
              Oda sayısı
              <input
                name="roomCount"
                aria-invalid={Boolean(fieldErrors.roomCount)}
                aria-describedby={
                  fieldErrors.roomCount ? "listing-form-error" : undefined
                }
                required
                maxLength={20}
                placeholder="3+1"
                defaultValue={listing?.roomCount || "3+1"}
              />
            </label>
          </div>
        )}
        <div className="field span">
          <label>
            Açık adres
            <input
              name="address"
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={
                fieldErrors.address ? "listing-form-error" : undefined
              }
              required
              minLength={5}
              maxLength={500}
              defaultValue={listing?.address}
            />
          </label>
        </div>
        {numbers
          .filter(
            ([key]) =>
              !(land && exchange && key === "price") &&
              (!land ||
                !landFields.includes(key as (typeof landFields)[number])),
          )
          .map(([key, label, value, min]) => (
            <div className="field" key={key}>
              <label>
                {label}
                <input
                  name={key}
                  aria-invalid={Boolean(fieldErrors[key])}
                  aria-describedby={
                    fieldErrors[key] ? "listing-form-error" : undefined
                  }
                  type={key === "price" ? "text" : "number"}
                  inputMode={key === "price" ? "decimal" : "numeric"}
                  placeholder={key === "price" ? "Örn. 3.250.000" : undefined}
                  step="1"
                  required={key !== "areaM2"}
                  min={min}
                  defaultValue={value ?? undefined}
                />
              </label>
            </div>
          ))}
        {rentalApartment && (
          <label className="field">
            WC sayısı (isteğe bağlı)
            <input
              name="wcCount"
              aria-invalid={Boolean(fieldErrors.wcCount)}
              aria-describedby={
                fieldErrors.wcCount ? "listing-form-error" : undefined
              }
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              step="1"
              placeholder="Belirtilmemiş"
              defaultValue={meta("WC Sayısı") || ""}
            />
          </label>
        )}
        {land && exchange && (
          <div className="field">
            <input type="hidden" name="price" value="0" />
            <p className="exchange-note">
              Fiyat yerine “Kat karşılığına uygun” gösterilecek.
            </p>
          </div>
        )}
        <label className="field">
          Pazarlık
          <select
            name="negotiable"
            defaultValue={meta("Pazarlık") || "Belirtilmemiş"}
          >
            <option>Belirtilmemiş</option>
            <option>Pazarlık yapılabilir</option>
            <option>Fiyat sabit</option>
          </select>
        </label>
        {land && (
          <>
            <label className="field">
              İmar durumu
              <select
                name="zoning"
                defaultValue={meta("İmar durumu") || "Belirtilmemiş"}
              >
                {zoningOptions.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="landExchange"
                checked={exchange}
                onChange={(e) => setExchange(e.target.checked)}
              />
              Kat karşılığına uygun
            </label>
          </>
        )}
        {!land && (
          <div className="field">
            <label>
              Isıtma
              <select
                name="heatingType"
                aria-invalid={Boolean(fieldErrors.heatingType)}
                aria-describedby={
                  fieldErrors.heatingType ? "listing-form-error" : undefined
                }
                defaultValue={listing?.heatingType || "Doğalgaz"}
              >
                {[
                  ...new Set([
                    "Doğalgaz",
                    "Merkezi",
                    "Klima",
                    "Soba",
                    "Yok",
                    ...(listing ? [listing.heatingType] : []),
                  ]),
                ].map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="field">
          <label>
            Durum
            <select
              name="status"
              value={publication}
              onChange={(e) => setPublication(e.target.value)}
            >
              <option value="published">Yayında — herkes görebilir</option>
              <option value="draft">Taslak — yalnızca siz görürsünüz</option>
              <option value="archived">Yayından kaldır</option>
            </select>
          </label>
        </div>
        {!land && (
          <>
            {" "}
            <label className="field">
              Tapu Durumu
              <select
                name="deedStatus"
                defaultValue={meta("Tapu Durumu") || "Belirtilmemiş"}
              >
                {[
                  "Belirtilmemiş",
                  "Kat mülkiyeti",
                  "Kat irtifakı",
                  "Arsa tapulu",
                  "Hisseli tapu",
                  "Müstakil tapu",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Kullanım Durumu
              <select
                name="occupancy"
                defaultValue={meta("Kullanım Durumu") || "Belirtilmemiş"}
              >
                {[
                  "Belirtilmemiş",
                  "Boş",
                  "Kiracılı",
                  "Mülk sahibi oturuyor",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Net alan (m²)
              <input
                name="netArea"
                type="number"
                min="1"
                max="10000000"
                defaultValue={
                  meta("Net Alan") === "Belirtilmemiş" ? "" : meta("Net Alan")
                }
              />
            </label>
          </>
        )}
        <AddressLocation
          onBusyChange={setLocationBusy}
          initialLatitude={listing?.latitude}
          initialLongitude={listing?.longitude}
        />
        <div className="field span">
          <label>
            Açıklama
            <textarea
              name="description"
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? "listing-form-error" : undefined
              }
              required
              minLength={30}
              maxLength={12000}
              defaultValue={listing?.description}
            />
          </label>
        </div>
        {(
          [
            "balcony",
            "elevator",
            "parking",
            "furnished",
            "complex",
            "seaView",
          ] as const
        ).map((k, i) =>
          k === "complex" ||
          (land &&
            ["balcony", "elevator", "furnished", "complex"].includes(
              k,
            )) ? null : (
            <label className="check" key={k}>
              <input
                name={k}
                type="checkbox"
                defaultChecked={listing?.[k] || false}
              />
              {
                [
                  "Balkon",
                  "Asansör",
                  "Otopark",
                  "Eşyalı",
                  "Site içerisinde",
                  "Deniz manzarası",
                ][i]
              }
            </label>
          ),
        )}
        {admin && (
          <label className="check">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={listing?.featured}
            />
            Öne çıkan ilan
          </label>
        )}
        {!land && (
          <>
            <label className="check">
              <input
                type="checkbox"
                name="complex"
                defaultChecked={listing?.complex}
              />
              Site İçerisinde
            </label>
            <PropertyTags
              name="interiorTags"
              title="İç Özellikler"
              initial={initialTags("İç Özellikler")}
              suggestions={[
                "ADSL",
                "Fiber",
                "Ebeveyn Banyo",
                "Çamaşır Makinesi",
                "Giyinme Odası",
                "Fırın",
                "Kiler",
                "Buzdolabı",
              ]}
            />
            <PropertyTags
              name="exteriorTags"
              title="Dış Özellikler"
              initial={initialTags("Dış Özellikler")}
              suggestions={[
                "Güvenlik",
                "Kamera Sistemi",
                "Bahçe",
                "Çocuk Parkı",
                "Yüzme Havuzu",
                "Açık Otopark",
                "Kapalı Otopark",
                "Yangın Merdiveni",
              ]}
            />
          </>
        )}
        <div className="field span">
          <label>
            Ek özellikler
            <textarea
              name="features"
              aria-invalid={Boolean(fieldErrors.features)}
              aria-describedby={
                fieldErrors.features ? "listing-form-error" : undefined
              }
              maxLength={12000}
              defaultValue={features
                .filter(
                  (f) =>
                    ![
                      "Tapu Durumu",
                      "Kullanım Durumu",
                      "Net Alan",
                      "İç Özellikler",
                      "Dış Özellikler",
                      "WC Sayısı",
                    ].includes(f.name),
                )
                .map((f) => `${f.name}: ${f.value}`)
                .join("\n")}
              placeholder="Her satıra bir özellik: örneğin Cephe: Güney"
            />
          </label>
        </div>
        {!listing && (
          <div className="span new-listing-photos">
            <h3>İlan fotoğrafları</h3>
            <p className="quiet">
              Birden fazla fotoğraf seçebilirsiniz. JPG, PNG, WebP · En fazla 20
              fotoğraf · Her biri en fazla 4 MB.
            </p>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              aria-label="İlan fotoğraflarını seçin"
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (
                  files.length > 20 ||
                  files.some(
                    (f) =>
                      f.size > 4 * 1024 * 1024 ||
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        f.type,
                      ),
                  )
                ) {
                  setError(
                    "En fazla 20 JPG, PNG veya WebP fotoğraf seçin; her dosya 4 MB sınırında olmalı.",
                  );
                  e.target.value = "";
                  return;
                }
                setNewPhotos(files);
                setError("");
              }}
            />
            {newPhotos.length > 0 && (
              <ul>
                {newPhotos.map((f, i) => (
                  <li key={`${f.name}-${i}`}>{f.name}</li>
                ))}
              </ul>
            )}
            {photoProgress && <p role="status">{photoProgress}</p>}
            {created && error && (
              <p className="quiet">
                İlan kaydedildi. Tekrar kaydettiğinizde yüklenemeyen fotoğraflar
                tamamlanır; yeni bir ilan oluşturulmaz.
              </p>
            )}
          </div>
        )}
        <div className="span">
          <p className="quiet">
            Onay adımı yok. “Yayında” seçtiğiniz ilan doğrudan sitede görünür.
          </p>
          <button disabled={busy || locationBusy} className="button">
            {locationBusy
              ? "Adres aranıyor…"
              : busy
                ? "Kaydediliyor…"
                : publication === "published"
                  ? listing
                    ? "Kaydet ve yayınla"
                    : "İlanı yayınla"
                  : publication === "archived"
                    ? "Kaydet ve yayından kaldır"
                    : "Taslağı kaydet"}
          </button>
        </div>
      </div>
    </form>
  );
}
export function ImagesManager({
  listingId,
  images,
}: {
  listingId: string;
  images: Img[];
}) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function change(method: string, path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await request(path, method, body);
      setOk("Fotoğraflar güncellendi.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ marginTop: 30 }}>
      <h2>Fotoğraflar</h2>
      <p className="quiet">
        JPG, PNG veya WebP · Dosya başına 4 MB · En fazla 20 fotoğraf
      </p>
      <label>
        Fotoğraf ekle
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (images.length + files.length > 20) {
              setError("En fazla 20 fotoğraf ekleyebilirsiniz.");
              return;
            }
            setBusy(true);
            setError("");
            setOk("");
            try {
              for (const file of files) {
                const f = new FormData();
                f.set("file", file);
                await request(`images/${listingId}`, "POST", f);
              }
              setOk("Fotoğraflar yüklendi.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              router.refresh();
            }
          }}
        />
      </label>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="alert success" role="status">
          {ok}
        </p>
      )}
      <div className="image-manager">
        {images.map((img, n) => (
          <div key={img.id}>
            <Image
              width={1600}
              height={1000}
              sizes="(max-width: 700px) 100vw, 60vw"
              src={img.imageUrl}
              alt={img.altText}
            />
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <button
                type="button"
                disabled={busy || img.isPrimary}
                className="button secondary small"
                onClick={() =>
                  void change("PATCH", `images/${listingId}`, {
                    ids: images.map((i) => i.id),
                    primary: img.id,
                  })
                }
              >
                {img.isPrimary ? "Ana fotoğraf" : "Ana yap"}
              </button>
              <button
                type="button"
                disabled={busy || n === 0}
                className="button secondary small"
                onClick={() => {
                  const ids = images.map((i) => i.id);
                  [ids[n - 1], ids[n]] = [ids[n], ids[n - 1]];
                  void change("PATCH", `images/${listingId}`, {
                    ids,
                    primary: images.find((i) => i.isPrimary)?.id || img.id,
                  });
                }}
              >
                Öne al
              </button>
              <button
                type="button"
                disabled={busy}
                className="button danger small"
                onClick={() => {
                  if (confirm("Fotoğrafı silmek istiyor musunuz?"))
                    void change("DELETE", `images/${listingId}/${img.id}`);
                }}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
