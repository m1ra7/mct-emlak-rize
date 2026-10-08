import { ListingGrid } from "./listing-grid";
import Link from "next/link";

import { searchListings, type SearchParams } from "@/lib/queries";

export type ListingResult = Awaited<ReturnType<typeof searchListings>>;
export function Cards({
  items,
  view = "grid",
}: {
  items: ListingResult["items"];
  view?: "grid" | "list";
}) {
  return <ListingGrid items={items} view={view} />;
}
export function Pagination({
  result,
  p,
  base = "/ilanlar",
}: {
  result: ListingResult;
  p: SearchParams;
  base?: string;
}) {
  if (result.pages <= 1) return null;
  function href(page: number) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p))
      if (typeof v === "string" && k !== "page") q.set(k, v);
    q.set("page", String(page));
    return `${base}?${q}`;
  }
  const pages = [
    ...new Set([
      1,
      result.page - 1,
      result.page,
      result.page + 1,
      result.pages,
    ]),
  ].filter((n) => n > 0 && n <= result.pages);
  return (
    <nav className="pagination" aria-label="Sayfalar">
      {result.page > 1 && (
        <Link className="button secondary" href={href(result.page - 1)}>
          Önceki
        </Link>
      )}
      {pages.map((n) => (
        <Link
          key={n}
          aria-current={n === result.page ? "page" : undefined}
          className={`button ${n === result.page ? "" : "secondary"}`}
          href={href(n)}
        >
          {n}
        </Link>
      ))}
      {result.page < result.pages && (
        <Link className="button secondary" href={href(result.page + 1)}>
          Sonraki
        </Link>
      )}
    </nav>
  );
}
