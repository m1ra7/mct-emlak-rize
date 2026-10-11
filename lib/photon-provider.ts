import {
  matchingPlaces,
  type AddressContext,
  type GeocodedPlace,
} from "./geocoding";
export async function photonRequest(
  query: string,
  options: {
    endpoint: string;
    agent: string;
    context?: AddressContext;
    throttle: () => Promise<void>;
    fetcher?: typeof fetch;
  },
) {
  const url = new URL(options.endpoint);
  url.search = new URLSearchParams({
    q: query,
    limit: "10",
    countrycode: "TR",
    bbox: "25.5,35.5,45,42.5",
  }).toString();
  await options.throttle();
  const response = await (options.fetcher || fetch)(url, {
    headers: { "User-Agent": options.agent },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Yedek adres servisine ulaşılamadı.");
  const body = await response.json();
  if (!Array.isArray(body?.features))
    throw new Error("Yedek adres servisi geçersiz yanıt verdi.");
  const places: GeocodedPlace[] = [];
  for (const feature of body.features) {
    const coordinate = feature?.geometry?.coordinates;
    if (
      feature?.geometry?.type !== "Point" ||
      !Array.isArray(coordinate) ||
      coordinate.length < 2 ||
      typeof coordinate[0] !== "number" ||
      typeof coordinate[1] !== "number" ||
      !Number.isFinite(coordinate[0]) ||
      !Number.isFinite(coordinate[1]) ||
      Math.abs(coordinate[0]) > 180 ||
      Math.abs(coordinate[1]) > 90
    )
      continue;
    const p = Object.fromEntries(
      Object.entries(feature.properties || {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    if (p.countrycode && p.countrycode.toUpperCase() !== "TR") continue;
    const name = [
      ...new Set(
        [
          p.name,
          p.housenumber,
          p.street,
          p.district,
          p.locality,
          p.city,
          p.county,
          p.state,
          p.country,
        ].filter(Boolean),
      ),
    ].join(", ");
    if (!name) continue;
    places.push({
      name,
      latitude: String(coordinate[1]),
      longitude: String(coordinate[0]),
      precise: !!p.housenumber,
      street: p.type === "street" || p.osm_key === "highway",
      address: {
        house_number: p.housenumber || "",
        road:
          p.street ||
          (p.type === "street" || p.osm_key === "highway" ? p.name : "") ||
          "",
        state: p.state || "",
        county: p.county || "",
        city: p.city || "",
        suburb: p.locality || p.district || "",
        country_code: (p.countrycode || "tr").toLowerCase(),
      },
    });
  }
  return options.context ? matchingPlaces(places, options.context) : places;
}
