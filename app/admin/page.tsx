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
import { count, eq, and } from "drizzle-orm";
import { searchListings } from "@/lib/queries";
import { ManagedListings } from "@/components/dashboard";
export default async function Admin() {
  const owner = await requireAdmin();
  const filters = [
    undefined,
    eq(listings.listingType, "satilik"),
    eq(listings.listingType, "kiralik"),
    eq(listings.status, "published"),
    eq(listings.status, "draft"),
    eq(listings.status, "archived"),
  ];
  const counts = await Promise.all(
    filters.map((filter) =>
      db()
        .select({ n: count() })
        .from(listings)
        .where(and(eq(listings.userId, owner.id), filter)),
    ),
  );
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
          <Plus size={17} /> Yeni ilan
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
            <strong>{counts[i][0].n}</strong>
          </div>
        ))}
      </div>
      <ManagedListings
        result={await searchListings({}, { owner: owner.id, admin: true })}
        admin
      />
    </>
  );
}
