export type GeocodedPlace = {
  name: string;
  latitude: string;
  longitude: string;
  precise?: boolean;
  street?: boolean;
};
export function geocodingResults(value: unknown): GeocodedPlace[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const latitude = Number(row.lat),
        longitude = Number(row.lon);
      if (
        typeof row.lat !== "string" ||
        typeof row.lon !== "string" ||
        typeof row.display_name !== "string" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      )
        return [];
      return [
        {
          name: row.display_name,
          latitude: row.lat,
          longitude: row.lon,
          precise: Number(row.place_rank) >= 28,
          street: Number(row.place_rank) >= 26,
        },
      ];
    })
    .slice(0, 5);
}

export function addressQuery(address: string, district: string, city: string) {
  const locality = district
    .toLocaleLowerCase("tr-TR")
    .startsWith(city.toLocaleLowerCase("tr-TR") + " ")
    ? district.slice(city.length).trim()
    : district;
  const cleaned = address
    .replace(/\s*\/\s*/g, ", ")
    .replace(/\bNo\s*:\s*/gi, "");
  const parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        ![city, district, locality, "Merkez", "Türkiye"].some(
          (x) => x.toLocaleLowerCase("tr-TR") === p.toLocaleLowerCase("tr-TR"),
        ),
    );
  return [...parts, locality === "Merkez" ? "" : locality, city, "Türkiye"]
    .filter(Boolean)
    .join(", ");
}
export function automaticPlace(places: GeocodedPlace[], address = "") {
  const precise = places.filter((p) => p.precise);
  if (precise.length === 1) return precise[0];
  const street = places.filter((p) => p.street);
  if (street.length === 1) return street[0];
  const neighborhood = address
    .match(/([\p{L}-]+)\s+mah(?:allesi|\.)/iu)?.[1]
    ?.toLocaleLowerCase("tr-TR");
  if (neighborhood) {
    const matching = street.filter((p) =>
      p.name.toLocaleLowerCase("tr-TR").includes(neighborhood + " mahallesi"),
    );
    if (matching.length === 1) return matching[0];
  }
  return undefined;
}

export function streetAddressQuery(query: string) {
  return query
    .replace(/[\p{L}-]+\s+mah(?:allesi|\.)\s*,?\s*/giu, "")
    .replace(/\s+\d+[A-Za-z]?(?:\/\d+)?(?=,|$)/g, "");
}
