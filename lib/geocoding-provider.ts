import {
  addressParts,
  automaticPlace,
  geocodingResults,
  matchingPlaces,
  streetAddressQuery,
  type AddressContext,
  type GeocodedPlace,
} from "./geocoding";
export async function geocodeRequest(
  query: string,
  options: {
    endpoint: string;
    agent: string;
    throttle: () => Promise<void>;
    fetcher?: typeof fetch;
    context?: AddressContext;
  },
) {
  const search = async (params: Record<string, string>) => {
    const url = new URL(options.endpoint);
    url.search = new URLSearchParams({
      format: "jsonv2",
      countrycodes: "tr",
      limit: "10",
      addressdetails: "1",
      layer: "address",
      "accept-language": "tr",
      ...params,
    }).toString();
    await options.throttle();
    const response = await (options.fetcher || fetch)(url, {
      headers: { "User-Agent": options.agent },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Adres arama servisine ulaşılamadı. Biraz sonra tekrar deneyin.",
      );
    const body = await response.json();
    if (!Array.isArray(body))
      throw new Error("Adres servisi geçersiz yanıt verdi. Tekrar deneyin.");
    const places = geocodingResults(body);
    return options.context ? matchingPlaces(places, options.context) : places;
  };
  let found: GeocodedPlace[] = [];
  let lastError: unknown;
  let succeeded = false;
  const attempt = async (params: Record<string, string>) => {
    try {
      const results = await search(params);
      succeeded = true;
      return results;
    } catch (error) {
      lastError = error;
      return [];
    }
  };
  found = await attempt({ q: query });
  const parts = addressParts(options.context?.address || query);
  if (
    options.context &&
    parts.road &&
    parts.houseNumber &&
    !automaticPlace(found, options.context.address, options.context)
  ) {
    const structured = await attempt({
      street: `${parts.houseNumber} ${parts.road}`,
      state: options.context.city,
      city: /merkez/i.test(options.context.district)
        ? options.context.city
        : options.context.district,
    });
    found = [...structured, ...found];
  }
  const fallback = streetAddressQuery(query);
  if (
    (options.context
      ? !automaticPlace(found, options.context.address, options.context) &&
        !found.some((p) => p.street)
      : !found.some((p) => p.precise || p.street)) &&
    fallback !== query
  )
    found = [...found, ...(await attempt({ q: fallback }))];
  if (!succeeded) throw lastError;
  const seen = new Set<string>();
  return found
    .filter((p) => {
      const key = `${p.latitude},${p.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
