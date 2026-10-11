// Homepage discovery shortcuts; all provinces remain available in search.
export const featuredRegionSlugs = [
  "rize",
  "trabzon",
  "artvin",
  "giresun",
  "ordu",
  "samsun",
];
export function discoveryCities<T extends { slug: string; name: string }>(
  cities: T[],
) {
  return [...cities].sort((a, b) => {
    const aIndex = featuredRegionSlugs.indexOf(a.slug);
    const bIndex = featuredRegionSlugs.indexOf(b.slug);
    return (
      (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) ||
      a.name.localeCompare(b.name, "tr")
    );
  });
}
