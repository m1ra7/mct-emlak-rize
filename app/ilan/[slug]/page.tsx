import { NearbyPlaces } from "@/components/nearby-places";
import { isLandType } from "@/lib/property-kind";
import { ListingGallery } from "@/components/listing-gallery";
import { listingMap } from "@/lib/listing-map";
import { ViewTracker } from "@/components/view-tracker";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listingDetail, searchListings } from "@/lib/queries";
import { currentUser } from "@/lib/security";
import { db } from "@/db";
import { listingFeatures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { money } from "@/components/ui";
import { PublicationActions } from "@/components/publication-actions";
import { SavedButton } from "@/components/local-favorites";
import { Cards } from "@/components/listings";
import {
  MapPin,
  Phone,
  BedDouble,
  Bath,
  Calendar,
  Building2,
  Layers,
} from "lucide-react";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!process.env.DATABASE_URL)
    return { title: "İlan", robots: { index: false } };
  const r = await listingDetail((await params).slug);
  if (!r || r.listing.status !== "published")
    return { title: "İlan", robots: { index: false, follow: false } };
  return {
    title: r.listing.title,
    description: r.listing.description.slice(0, 160),
    alternates: { canonical: `/ilan/${r.listing.slug}` },
    openGraph: {
      title: r.listing.title,
      description: r.listing.description.slice(0, 160),
      images: r.images[0] ? [r.images[0].imageUrl] : [],
    },
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!process.env.DATABASE_URL) notFound();
  const r = await listingDetail((await params).slug);
  if (!r) notFound();
  const u = await currentUser();
  const l = r.listing;
  if (l.status !== "published" && u?.id !== l.userId) notFound();
  const [similar, features] = await Promise.all([
    searchListings({ district: l.districtId, type: l.listingType }),
    db()
      .select()
      .from(listingFeatures)
      .where(eq(listingFeatures.listingId, l.id)),
  ]);

  const phone = (r.owner.phone || process.env.CONTACT_PHONE)?.replace(
    /[^+0-9]/g,
    "",
  );
  const land = isLandType({ name: r.property });
  const specs = [
    ["İlan türü", l.listingType === "satilik" ? "Satılık" : "Kiralık"],
    ["Gayrimenkul", r.property],
    ["Brüt Alan", l.areaM2 == null ? "Belirtilmemiş" : `${l.areaM2} m²`],
    ["Oda", l.roomCount],
    ["Bina yaşı", String(l.buildingAge)],
    ["Bulunduğu kat", String(l.floor)],
    ["Toplam kat", String(l.totalFloors)],
    ["Isıtma", l.heatingType],
    ["Banyo", String(l.bathroomCount)],
    ...(
      [
        "balcony",
        "elevator",
        "parking",
        "furnished",
        "complex",
        "seaView",
      ] as const
    ).map((k, i) => [
      [
        "Balkon",
        "Asansör",
        "Otopark",
        "Eşyalı",
        "Site içerisinde",
        "Deniz manzarası",
      ][i],
      l[k] ? "Var" : "Yok",
    ]),
    ...features
      .filter((f) => !["İç Özellikler", "Dış Özellikler"].includes(f.name))
      .map((f) => [
        f.name,
        f.name === "Net Alan" && f.value !== "Belirtilmemiş"
          ? `${f.value} m²`
          : f.value,
      ]),
  ].filter(
    ([name]) =>
      !land ||
      ![
        "Oda",
        "Bina yaşı",
        "Bulunduğu kat",
        "Toplam kat",
        "Isıtma",
        "Banyo",
        "Balkon",
        "Asansör",
        "Eşyalı",
        "Site içerisinde",
      ].includes(name),
  );
  const map = listingMap({
    address: l.address,
    city: r.city,
    district: r.district,
    latitude: l.latitude,
    longitude: l.longitude,
  });
  const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const json = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title,
    description: l.description,
    url: `${app}/ilan/${l.slug}`,
    image: r.images.map((i) => i.imageUrl),
    datePosted: l.publishedAt?.toISOString(),
    offers: { "@type": "Offer", price: l.price, priceCurrency: l.currency },
    contentLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: l.address,
        addressLocality: r.district,
        addressRegion: r.city,
        addressCountry: "TR",
      },
    },
  };
  return (
    <div className="wrap">
      {l.status === "published" && <ViewTracker id={l.id} />}
      <div className="breadcrumbs">
        <Link href="/">Ana sayfa</Link> / <Link href="/ilanlar">İlanlar</Link> /{" "}
        {r.district}
      </div>
      {l.status !== "published" && (
        <div className="publication-notice">
          <div>
            <strong>Bu ilan henüz yayında değil.</strong>
            <p>
              Önizlemeyi yalnızca siz görebilirsiniz. İlanı aşağıdaki düğmeyle
              doğrudan yayınlayabilirsiniz.
            </p>
          </div>
          <PublicationActions id={l.id} status={l.status} />
          <Link href={`/admin/listings/${l.id}`} className="text-link">
            İlanı düzenle
          </Link>
        </div>
      )}
      <div className="row between">
        <div>
          <span className="eyebrow">
            {l.listingType === "satilik" ? "SATILIK" : "KİRALIK"} · {r.property}
          </span>
          <h1 className="listing-detail-title">{l.title}</h1>
          <p className="row quiet">
            <MapPin size={18} />
            {r.city}, {r.district}
          </p>
        </div>
        <SavedButton id={l.id} />
      </div>
      <ListingGallery images={r.images} title={l.title} />
      <strong className="price detail-mobile-price">
        {features.some((f) => f.name === "Kat karşılığı" && f.value === "Evet")
          ? "Kat karşılığına uygun"
          : money(l.price, l.currency)}
      </strong>

      <div className="detail-grid">
        <div>
          <div className="panel">
            {!land && (
              <div className="property-key-facts">
                {(
                  [
                    ["Oda Sayısı", l.roomCount, BedDouble],
                    ["Banyo Sayısı", String(l.bathroomCount), Bath],
                    ["Bina Yaşı", String(l.buildingAge), Calendar],
                    ["Kat Sayısı", String(l.totalFloors), Building2],
                    ["Bulunduğu Kat", String(l.floor), Layers],
                  ] as const
                ).map(([name, value, Icon]) => (
                  <div key={String(name)}>
                    <Icon size={21} />
                    <span>{String(name)}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            )}
            <dl className="specs">
              {specs
                .filter(
                  ([k]) =>
                    ![
                      "Alan",
                      "Oda",
                      "Bina yaşı",
                      "Bulunduğu kat",
                      "Toplam kat",
                      "Banyo",
                    ].includes(k),
                )
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {features
              .filter((f) =>
                ["İç Özellikler", "Dış Özellikler"].includes(f.name),
              )
              .map((f) => {
                let tags: string[] = [];
                try {
                  const parsed = JSON.parse(f.value);
                  if (Array.isArray(parsed))
                    tags = parsed.filter((x) => typeof x === "string");
                } catch {
                  /* legacy values are shown in other features */
                }
                return tags.length ? (
                  <section className="property-feature-section" key={f.id}>
                    <h3>{f.name}</h3>
                    <div className="property-tag-list">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </section>
                ) : null;
              })}
            <h2 style={{ marginTop: 30 }}>Açıklama</h2>
            <p className="description">{l.description}</p>
            <p className="quiet" style={{ fontSize: 14 }}>
              İlan tarihi: {l.createdAt.toLocaleDateString("tr-TR")} ·
              Güncelleme: {l.updatedAt.toLocaleDateString("tr-TR")}
            </p>
          </div>
          <NearbyPlaces
            id={l.id}
            latitude={l.latitude}
            longitude={l.longitude}
            address={l.address}
            land={land}
          />
          {map.approximate && (
            <section className="panel" style={{ marginTop: 24 }}>
              <h2>Konum</h2>
              <p>{l.address}</p>
              {map.approximate && (
                <iframe
                  title="İlan konumu"
                  loading="lazy"
                  className="listing-map"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={map.embed}
                />
              )}
              <a
                href={map.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {map.label}
              </a>
              {map.approximate && (
                <p className="quiet map-note">
                  Harita girilen adresi arar; sonuç yaklaşık olabilir.
                </p>
              )}
            </section>
          )}
        </div>
        <aside className="panel">
          <strong className="price detail-desktop-price">
            {features.some(
              (f) => f.name === "Kat karşılığı" && f.value === "Evet",
            )
              ? "Kat karşılığına uygun"
              : money(l.price, l.currency)}
          </strong>

          <h3>{r.owner.name}</h3>
          <p className="quiet">İlan sahibi</p>
          {phone && (
            <div className="stack">
              <a
                className="button"
                style={{ width: "100%" }}
                href={`tel:${phone}`}
              >
                <Phone size={18} />
                {r.owner.phone}
              </a>
              <a
                className="button secondary"
                style={{ width: "100%" }}
                href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(l.title + " hakkında bilgi almak istiyorum.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp ile iletişim
              </a>
            </div>
          )}
          {(u?.id === l.userId || u?.role === "admin") && (
            <Link
              href={`/${u?.role === "admin" ? "admin/listings" : "profil/ilanlarim"}/${l.id}`}
              className="button secondary"
              style={{ marginTop: 20 }}
            >
              İlanı düzenle
            </Link>
          )}
        </aside>
      </div>
      <section className="section">
        <h2>Benzer ilanlar</h2>
        <Cards
          items={similar.items.filter((i) => i.listing.id !== l.id).slice(0, 3)}
        />
      </section>
      {l.status === "published" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(json).replace(/</g, "\u003c"),
          }}
        />
      )}
    </div>
  );
}
