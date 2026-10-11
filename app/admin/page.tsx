import Link from "next/link";
import {
  Plus,
  Building2,
  KeyRound,
  Radio,
  FileText,
  Archive,
} from "lucide-react";
import { requireAdmin } from "@/lib/security";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { searchListings } from "@/lib/queries";
import { ManagedListings } from "@/components/dashboard";
export default async function Admin() {
  const owner = await requireAdmin();
  const [countRows, result] = await Promise.all([
    db()
      .select({
        total: sql<number>`count(*)::int`,
        sale: sql<number>`count(*) filter (where ${listings.listingType} = 'satilik')::int`,
        rent: sql<number>`count(*) filter (where ${listings.listingType} = 'kiralik')::int`,
        published: sql<number>`count(*) filter (where ${listings.status} = 'published')::int`,
        draft: sql<number>`count(*) filter (where ${listings.status} = 'draft')::int`,
        archived: sql<number>`count(*) filter (where ${listings.status} = 'archived')::int`,
      })
      .from(listings)
      .where(eq(listings.userId, owner.id)),
    searchListings({}, { owner: owner.id, admin: true }),
  ]);
  const [counts] = countRows;
  const totals = [
    counts.total,
    counts.sale,
    counts.rent,
    counts.published,
    counts.draft,
    counts.archived,
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">SİZİN PORTFÖYÜNÜZ</span>
          <h1>Her şey kontrolünüzde.</h1>
          <p className="quiet">
            İlanlarınızı ekleyin, düzenleyin ve doğrudan yayınlayın.
          </p>
        </div>
        <Link href="/admin/listings/new" className="button">
          <Plus size={17} /> Yeni ilan ekle
        </Link>
      </div>
      <div className="stats">
        {[
          "Toplam ilan",
          "Satılık",
          "Kiralık",
          "Yayında",
          "Taslak",
          "Arşiv",
        ].map((title, i) => (
          <div className="stat" key={title}>
            <span className="stat-icon">
              {
                [
                  <Building2 key="all" size={19} />,
                  <Building2 key="sale" size={19} />,
                  <KeyRound key="rent" size={19} />,
                  <Radio key="live" size={19} />,
                  <FileText key="draft" size={19} />,
                  <Archive key="archive" size={19} />,
                ][i]
              }
            </span>
            <span className="quiet">{title}</span>
            <strong>{totals[i]}</strong>
          </div>
        ))}
      </div>
      <ManagedListings result={result} admin showCreate={false} />
    </>
  );
}
