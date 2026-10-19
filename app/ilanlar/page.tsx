import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { locations, searchListings, type SearchParams } from "@/lib/queries";
import { Cards, Pagination } from "@/components/listings";
import { Filters } from "@/components/filters";
import { ServiceUnavailable } from "@/components/ui";
export const dynamic = "force-dynamic";
const baseMetadata = {
  title: "İlanlar",
  alternates: { canonical: "/ilanlar" },
};
export async function generateMetadata() {
  const { tr } = await getTranslations();
  return { ...baseMetadata, title: tr("İlanlar") };
}
export default async function Listings({
  searchParams,
  forcedType,
}: {
  searchParams: Promise<SearchParams>;
  forcedType?: "satilik" | "kiralik";
}) {
  const { tr } = await getTranslations();
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
        <span className="eyebrow">{tr("YENİ ADRESİNİZİ KEŞFEDİN")}</span>
        <h1>
          {p.type === "satilik"
            ? tr("Satılık gayrimenkuller")
            : p.type === "kiralik"
              ? tr("Kiralık gayrimenkuller")
              : p.featured === "true"
                ? tr("Öne çıkan ilanlar")
                : tr("Portföyü keşfedin.")}
        </h1>
        <p className="quiet">
          {tr(
            "Karadeniz ağırlıklı, Türkiye’nin farklı şehirlerine uzanan portföyümüzden size uygun gayrimenkulü keşfedin.",
          )}{" "}
        </p>
      </div>
      <div className="portfolio-layout">
        <Filters key={JSON.stringify(p)} data={data} p={p} />
        <section
          className="portfolio-results"
          style={{ width: "100%", minWidth: 0 }}
        >
          <div className="row between results-header">
            <span>{tr("{count} ilan bulundu", { count: result.total })}</span>
            <span className="quiet">
              {tr("Sayfa {page} / {pages}", {
                page: result.page,
                pages: Math.max(result.pages, 1),
              })}
            </span>
          </div>
          {featuredFallback && (
            <p className="portfolio-notice">
              {tr(
                "Henüz öne çıkan ilan işaretlenmemiş. Yayındaki ilanları görüntülüyorsunuz.",
              )}{" "}
            </p>
          )}
          <nav
            className="listing-view-options"
            aria-label={tr("İlan görünümü")}
          >
            <Link
              href={viewHref("grid")}
              className="button secondary"
              aria-current={view === "grid" ? "page" : undefined}
            >
              <LayoutGrid size={18} />
              {tr("Yan yana kartlar")}{" "}
            </Link>
            <Link
              href={viewHref("list")}
              className="button secondary"
              aria-current={view === "list" ? "page" : undefined}
            >
              <List size={18} />
              {tr("Alt alta liste")}{" "}
            </Link>
          </nav>
          <Cards items={result.items} view={view} />
          <Pagination result={result} p={p} />
        </section>
      </div>
    </div>
  );
}
