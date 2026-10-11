export type AddressContext = {
  address: string;
  city: string;
  district: string;
  neighborhood?: string;
};
export type GeocodedPlace = {
  name: string;
  latitude: string;
  longitude: string;
  precise?: boolean;
  street?: boolean;
  address?: Record<string, string>;
};
const normalized = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const localityKey = (value: string) =>
  normalized(value)
    .replace(/\b(mahallesi|mahalle|mah|ilcesi|ili|province|district)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
const roadKey = (value: string) =>
  normalized(value)
    .replace(/\b(cad|cd|caddesi)\b/g, "caddesi")
    .replace(/\b(sk|sok|sokagi|sokak)\b/g, "sokak")
    .replace(/\b(blv|bulvar|bulvari)\b/g, "bulvari");
// Preserve building numbers such as 12/3 while separating province / district text.
const addressSeparators = (value: string) =>
  value.replace(/(?<!\d)\s*\/\s*|\s*\/\s*(?![\d\p{L}])/gu, ", ");
export function addressParts(address: string) {
  const parts = addressSeparators(address)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const neighborhoodPart = parts.find((p) =>
    /\bmah(?:allesi|alle|\.)/iu.test(p),
  );
  const neighborhood =
    neighborhoodPart?.match(/^(.*?)\s+mah(?:allesi|alle|\.)/iu)?.[1]?.trim() ||
    "";
  const roadPart = parts.find((p) =>
    /(?:caddesi|cad\.?|cd\.?|sokak|sokağı|sk\.?|bulvarı|blv\.?)\s*(?:\d|no|$)/iu.test(
      p,
    ),
  );
  const withoutNeighborhood = roadPart?.replace(
    /^.*?\s+mah(?:allesi|alle|\.)\s*/iu,
    "",
  );
  const road =
    withoutNeighborhood
      ?.match(
        /^(.*?(?:caddesi|cad\.?|cd\.?|sokak|sokağı|sk\.?|bulvarı|blv\.?))(?=\s|$)/iu,
      )?.[1]
      ?.trim() || "";
  const houseNumber =
    address.match(
      /\bno\.?\s*:?\s*(\d+[\p{L}]?(?:[-/](?:\d+[\p{L}]?|[\p{L}]))?)/iu,
    )?.[1] ||
    withoutNeighborhood
      ?.slice(road.length)
      .match(/^\s*(\d+[\p{L}]?(?:[-/](?:\d+[\p{L}]?|[\p{L}]))?)/u)?.[1] ||
    "";
  return { neighborhood, road, houseNumber };
}
export function geocodingResults(value: unknown): GeocodedPlace[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>,
        latitude = Number(row.lat),
        longitude = Number(row.lon);
      if (
        typeof row.lat !== "string" ||
        typeof row.lon !== "string" ||
        typeof row.display_name !== "string" ||
        !row.lat.trim() ||
        !row.lon.trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      )
        return [];
      const address =
        row.address && typeof row.address === "object"
          ? Object.fromEntries(
              Object.entries(row.address).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            )
          : {};
      return [
        {
          name: row.display_name,
          latitude: row.lat,
          longitude: row.lon,
          address,
          precise: !!address.house_number,
          street:
            row.addresstype === "road" ||
            row.category === "highway" ||
            (Number(row.place_rank) >= 26 && Number(row.place_rank) <= 27),
        },
      ];
    })
    .slice(0, 10);
}
function localityMatches(place: GeocodedPlace, wanted: string, keys: string[]) {
  if (!wanted) return true;
  const names = [
    ...keys.map((key) => place.address?.[key] || ""),
    ...place.name.split(","),
  ];
  return names.some((name) => localityKey(name) === localityKey(wanted));
}
export function matchingPlaces(
  places: GeocodedPlace[],
  context: AddressContext,
) {
  const expectedNeighborhood =
    context.neighborhood || addressParts(context.address).neighborhood;
  const central = [
    "merkez",
    localityKey(context.city),
    `${localityKey(context.city)} merkez`,
  ].includes(localityKey(context.district));
  return places.filter((p) => {
    if (p.address?.country_code && p.address.country_code !== "tr")
      return false;
    if (
      p.address?.state &&
      localityKey(p.address.state) !== localityKey(context.city)
    )
      return false;
    if (!localityMatches(p, context.city, ["state", "city", "province"]))
      return false;
    if (
      !central &&
      !localityMatches(p, context.district, [
        "county",
        "district",
        "city",
        "town",
        "city_district",
      ])
    )
      return false;
    if (!central) {
      const actualDistrict = p.address?.county || p.address?.district;
      if (
        actualDistrict &&
        localityKey(actualDistrict) !== localityKey(context.district)
      )
        return false;
    }
    if (central) {
      const actualDistrict =
        p.address?.county ||
        p.address?.district ||
        p.address?.city_district ||
        p.address?.town;
      if (
        actualDistrict &&
        ![
          "merkez",
          localityKey(context.city),
          `${localityKey(context.city)} merkez`,
        ].includes(localityKey(actualDistrict))
      )
        return false;
    }
    // If OSM specifies another neighborhood, never silently use its street.
    const structuredNeighborhoods = [
      p.address?.suburb,
      p.address?.quarter,
      p.address?.neighbourhood,
    ].filter((n): n is string => !!n);
    const neighborhoods = structuredNeighborhoods.length
      ? structuredNeighborhoods
      : p.name.split(",").filter((n) => /mahallesi/i.test(n));
    const requested = addressParts(context.address);
    if (
      requested.road &&
      p.address?.road &&
      roadKey(requested.road) !== roadKey(p.address.road)
    )
      return false;
    if (
      requested.houseNumber &&
      p.precise &&
      normalized(p.address?.house_number || "") !==
        normalized(requested.houseNumber)
    )
      return false;
    if (
      expectedNeighborhood &&
      neighborhoods.length &&
      !neighborhoods.some(
        (n) => localityKey(n) === localityKey(expectedNeighborhood),
      )
    )
      return false;
    return true;
  });
}
export function automaticPlace(
  places: GeocodedPlace[],
  address = "",
  context?: AddressContext,
) {
  const parts = addressParts(address);
  const candidates = context ? matchingPlaces(places, context) : places;
  const neighborhood = context?.neighborhood || parts.neighborhood;
  const matched = candidates.filter((p) => {
    if (
      neighborhood &&
      !localityMatches(p, neighborhood, ["suburb", "quarter", "neighbourhood"])
    )
      return false;
    const road =
      p.address?.road || p.address?.pedestrian || p.name.split(",")[0];
    return !parts.road || roadKey(road) === roadKey(parts.road);
  });
  const precise = matched.filter(
    (p) =>
      p.precise &&
      (!address || Boolean(parts.road && parts.houseNumber)) &&
      (!parts.houseNumber ||
        normalized(p.address?.house_number || "") ===
          normalized(parts.houseNumber)),
  );
  if (precise.length === 1) return precise[0];
  // A road's centre is not a building number. Offer it as a suggestion, never as an exact pin.
  if (parts.houseNumber) return undefined;
  const streets = matched.filter((p) => p.street);
  return !address && streets.length === 1 ? streets[0] : undefined;
}
export function addressQuery(
  address: string,
  district: string,
  city: string,
  neighborhood = "",
) {
  const locality = district
    .toLocaleLowerCase("tr-TR")
    .startsWith(city.toLocaleLowerCase("tr-TR") + " ")
    ? district.slice(city.length).trim()
    : district;
  const cleaned = addressSeparators(address).replace(/\bNo\.?\s*:\s*/gi, "");
  const parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        ![city, district, locality, "Merkez", "Türkiye"].some(
          (x) => localityKey(x) === localityKey(p),
        ),
    );
  if (
    neighborhood &&
    !parts.some((p) => localityKey(p) === localityKey(neighborhood)) &&
    !addressParts(address).neighborhood
  )
    parts.unshift(`${neighborhood} Mahallesi`);
  return [
    ...parts,
    localityKey(locality) === "merkez" ? "" : locality,
    city,
    "Türkiye",
  ]
    .filter(Boolean)
    .join(", ");
}
export function streetAddressQuery(query: string) {
  return query
    .split(",")
    .map((part) =>
      part
        .replace(/^\s*.*?\s+mah(?:allesi|alle|\.)\s*/iu, "")
        .replace(/\s+\d+[A-Za-z]?(?:\/\d+)?\s*$/g, "")
        .trim(),
    )
    .filter(Boolean)
    .join(", ");
}
