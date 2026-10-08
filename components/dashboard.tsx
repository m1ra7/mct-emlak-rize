import { isLandType } from "@/lib/property-kind";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { PublicationActions } from "./publication-actions";
import Link from "next/link";
import { DeleteListing } from "./widgets";
import { money, statusLabel, Empty } from "./ui";
import { Pagination, type ListingResult } from "./listings";
import type { SearchParams } from "@/lib/queries";
export function ManagedListings({
  result,
  admin = false,
  p = {},
}: {
  result: ListingResult;
  admin?: boolean;
  p?: SearchParams;
}) {
  const base = "/admin/listings";
  return (
    <>
      <div className="row between" style={{ marginBottom: 24 }}>
        <h2>{admin ? "İlan yönetimi" : "İlanlarım"}</h2>
        <Link href={`${base}/${admin ? "new" : "yeni"}`} className="button">
          <Plus size={17} /> Yeni ilan
        </Link>
      </div>
      {result.items.length ? (
        <div className="panel table-scroll managed-listings-table">
          <table>
            <thead>
              <tr>
                <th>İlan</th>
                <th>Fiyat</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map(
                ({ listing: l, district, image, property, landExchange }) => (
                  <tr key={l.id}>
                    <td data-label="İlan">
                      <div className="managed-property">
                        {image && (
                          <Image
                            src={image}
                            width={88}
                            height={76}
                            alt=""
                            className="managed-thumb"
                          />
                        )}
                        <div>
                          <Link href={`/ilan/${l.slug}`}>
                            <strong>{l.title}</strong>
                          </Link>
                          <div className="quiet">
                            {district} ·{" "}
                            {!isLandType({ name: property }) &&
                              `${l.roomCount} · `}
                            {l.areaM2 == null
                              ? "Alan belirtilmemiş"
                              : `${l.areaM2} m²`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Fiyat">
                      {landExchange
                        ? "Kat karşılığına uygun"
                        : money(l.price, l.currency)}
                    </td>
                    <td data-label="Durum">
                      <span className={`tag status ${l.status}`}>
                        {statusLabel[l.status]}
                      </span>
                      {l.featured && <p className="quiet">Öne çıkan</p>}
                    </td>
                    <td data-label="İşlemler">
                      <div className="row managed-actions">
                        <PublicationActions
                          id={l.id}
                          status={l.status}
                          compact
                        />
                        <Link
                          className="button secondary small"
                          href={`${base}/${l.id}`}
                        >
                          <Pencil size={14} /> Düzenle
                        </Link>
                        <DeleteListing id={l.id} />
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Henüz ilan eklenmemiş."
          text="İlk ilanınızı oluşturabilirsiniz."
        />
      )}
      <Pagination result={result} p={p} base={base} />
    </>
  );
}
