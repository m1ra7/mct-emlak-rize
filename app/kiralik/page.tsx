import Listings from "../ilanlar/page";
import type { SearchParams } from "@/lib/queries";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kiralık ilanlar",
  alternates: { canonical: "/kiralik" },
};
export default async function TypeListings({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Listings
      forcedType="kiralik"
      searchParams={Promise.resolve({ ...params, type: "kiralik" })}
    />
  );
}
