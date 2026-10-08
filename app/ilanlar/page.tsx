import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { locations, searchListings, type SearchParams } from "@/lib/queries";
import { Cards, Pagination } from "@/components/listings";
import { Filters } from "@/components/filters";
import { ServiceUnavailable } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "İlanlar",
  alternates: { canonical: "/ilanlar" },
};
export default async function Listings({
  searchParams,
  forcedType,
}: {
  searchParams: Promise<SearchParams>;
  forcedType?: "satilik" | "kiralik";
}) {
  if (!process.env.DATABASE_URL) return <ServiceUnavailable />;
  const incoming = await searchParams;
  let p = forcedType ? { ...incoming, type: forcedType } : incoming;
  const [data, initialResult] = await Promise.all([
    locations(),
    searchListings(p),
  ]);
  let result = initialResult;
  const featuredFallback = p.featured === "true" && result.total === 0;
  if (featuredFallback) {
    p = { ...p, featured: undefined, page: "1" };
    result = await searchListings(p);
  }
  const view = p.view === "list" ? "list" : "grid";
  function viewHref(mode: string) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(p))
      if (typeof value === "string") query.set(key, value);
    query.set("view", mode);
    return `/ilanlar?${query}`;
  }
  return (
    <div className="wrap portfolio-page">
      <div className="page-intro">
        <span className="eyebrow">YENİ ADRESİNİZİ KEŞFEDİN</span>
        <h1>
          {p.type === "satilik"
            ? "Satılık gayrimenkuller"
            : p.type === "kiralik"
              ? "Kiralık gayrimenkuller"
              : p.featured === "true"
                ? "Öne çıkan ilanlar"
                : "Portföyü keşfedin."}
        </h1>
        <p className="quiet">
          Bütçenize, konumunuza ve hayallerinize uyan gayrimenkuller.
        </p>
      </div>
      <div className="portfolio-layout">
        <Filters key={JSON.stringify(p)} data={data} p={p} />
        <section
          className="portfolio-results"
          style={{ width: "100%", minWidth: 0 }}
        >
          <div className="row between results-header">
            <span>
              <strong>{result.total}</strong> ilan bulundu
            </span>
            <span className="quiet">
              Sayfa {result.page} / {Math.max(result.pages, 1)}
            </span>
          </div>
          {featuredFallback && (
            <p className="portfolio-notice">
              Henüz öne çıkan ilan işaretlenmemiş. Yayındaki ilanları
              görüntülüyorsunuz.
            </p>
          )}
          <nav className="listing-view-options" aria-label="İlan görünümü">
            <Link
              href={viewHref("grid")}
              className="button secondary"
              aria-current={view === "grid" ? "page" : undefined}
            >
              <LayoutGrid size={18} />
              Yan yana kartlar
            </Link>
            <Link
              href={viewHref("list")}
              className="button secondary"
              aria-current={view === "list" ? "page" : undefined}
            >
              <List size={18} />
              Alt alta liste
            </Link>
          </nav>
          <Cards items={result.items} view={view} />
          <Pagination result={result} p={p} />
        </section>
      </div>
    </div>
  );
}
