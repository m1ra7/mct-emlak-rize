import { isLandType } from "@/lib/property-kind";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  MapPin,
  BedDouble,
  Maximize,
  ArrowUpRight,
} from "lucide-react";
import type { ListingResult } from "./listings";
import { SavedButton } from "./local-favorites";
import { Empty, money } from "./ui";
export function ListingGrid({
  items,
  view = "grid",
}: {
  items: ListingResult["items"];
  view?: "grid" | "list";
}) {
  if (!items.length) return <Empty />;
  return (
    <div
      className={`listing-cards ${view === "list" ? "listing-cards-list" : ""}`}
    >
      {items.map(
        ({ listing: l, city, district, image, property, landExchange }) => (
          <article className="card" key={l.id}>
            <div className="photo">
              <Link href={`/ilan/${l.slug}`} tabIndex={-1}>
                {image ? (
                  <Image
                    width={1600}
                    height={1000}
                    sizes={
                      view === "list"
                        ? "(max-width: 640px) 35vw, (max-width: 759px) 240px, (max-width: 1400px) 34vw, 440px"
                        : "(max-width: 759px) 100vw, (max-width: 1100px) 50vw, (max-width: 1400px) 33vw, 440px"
                    }
                    src={image}
                    alt={l.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="no-photo">
                    <Building2 size={38} />
                    <span>Fotoğraf eklenmemiş</span>
                  </div>
                )}
              </Link>
              {l.featured && <span className="featured-label">Öne çıkan</span>}
              <span className="tag">
                {l.listingType === "satilik" ? "Satılık" : "Kiralık"} ·{" "}
                {property}
              </span>
              <SavedButton id={l.id} />
            </div>
            <div className="cardbody">
              <span className="card-location">
                {district.toLocaleUpperCase("tr-TR")}
              </span>
              <div className="card-price-row">
                <span className="price">
                  {landExchange
                    ? "Kat karşılığına uygun"
                    : money(l.price, l.currency)}
                </span>
                <Link
                  href={`/ilan/${l.slug}`}
                  className="card-arrow"
                  aria-label={`${l.title} detayları`}
                >
                  <ArrowUpRight size={20} />
                </Link>
              </div>
              <Link href={`/ilan/${l.slug}`} className="cardtitle">
                {l.title}
              </Link>
              <div className="row quiet" style={{ gap: 5, fontSize: 14 }}>
                <MapPin size={15} />
                {city}, {district}
              </div>
              <div className="metadata">
                {!isLandType({ name: property }) && (
                  <span>
                    <BedDouble size={16} />
                    {l.roomCount}
                  </span>
                )}
                <span>
                  <Maximize size={15} />
                  {l.areaM2 == null ? "Alan belirtilmemiş" : `${l.areaM2} m²`}
                </span>
                {!isLandType({ name: property }) && (
                  <span>
                    <Building2 size={15} />
                    {l.floor}. kat
                  </span>
                )}
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}
