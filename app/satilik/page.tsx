import { getTranslations } from "@/lib/i18n/server";
import Listings from "../ilanlar/page";
import type { SearchParams } from "@/lib/queries";
export const dynamic = "force-dynamic";
const baseMetadata = {
  title: "Satılık ilanlar",
  alternates: { canonical: "/satilik" },
};
export async function generateMetadata() {
  const { tr } = await getTranslations();
  return { ...baseMetadata, title: tr("Satılık ilanlar") };
}
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
