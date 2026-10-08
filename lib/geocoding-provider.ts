import { geocodingResults, streetAddressQuery } from "./geocoding";
export async function geocodeRequest(
  query: string,
  options: {
    endpoint: string;
    agent: string;
    throttle: () => Promise<void>;
    fetcher?: typeof fetch;
  },
) {
  const url = new URL(options.endpoint);
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "tr",
    limit: "5",
    addressdetails: "1",
    "accept-language": "tr",
  }).toString();
  const search = async () => {
    await options.throttle();
    const response = await (options.fetcher || fetch)(url, {
      headers: { "User-Agent": options.agent },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Adres arama servisine ulaşılamadı. Biraz sonra tekrar deneyin.",
      );
    const body = await response.json();
    if (!Array.isArray(body))
      throw new Error("Adres servisi geçersiz yanıt verdi. Tekrar deneyin.");
    return geocodingResults(body);
  };
  const found = await search();
  const fallback = streetAddressQuery(query);
  if (found.length || fallback === query) return found;
  url.searchParams.set("q", fallback);
  return search();
}
