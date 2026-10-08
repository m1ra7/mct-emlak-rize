import Listings from "../ilanlar/page";
import type { SearchParams } from "@/lib/queries";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Satılık ilanlar",
  alternates: { canonical: "/satilik" },
};
export default async function TypeListings({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Listings
      forcedType="satilik"
      searchParams={Promise.resolve({ ...params, type: "satilik" })}
    />
  );
}
