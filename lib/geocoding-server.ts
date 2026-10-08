import { unstable_cache } from "next/cache";
import { limit, HttpError } from "./security";
import { geocodeRequest } from "./geocoding-provider";
import type { GeocodedPlace } from "./geocoding";
async function throttle() {
  for (let attempt = 0; ; attempt++) {
    try {
      await limit("geocode-global", 1, 2);
      return;
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 429 || attempt >= 3)
        throw e;
      await new Promise((resolve) => setTimeout(resolve, 2100));
    }
  }
}
const cachedLookup = unstable_cache(
  async (query: string) => {
    try {
      return await geocodeRequest(query, {
        endpoint:
          process.env.NOMINATIM_URL ||
          "https://nominatim.openstreetmap.org/search",
        agent: `MCT-Emlak/1.0 (${process.env.NEXT_PUBLIC_APP_URL || "local development"}; ${process.env.ADMIN_EMAIL || "owner"})`,
        throttle,
      });
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(
        503,
        e instanceof Error ? e.message : "Adres servisine ulaşılamadı.",
      );
    }
  },
  ["mct-address-search-v3", process.env.NOMINATIM_URL || "default"],
  { revalidate: 86400 },
);
// Share concurrent blur/button/save requests for the same address.
const pending = new Map<string, Promise<GeocodedPlace[]>>();
export function lookupAddress(query: string) {
  const current = pending.get(query);
  if (current) return current;
  const request = cachedLookup(query).finally(() => pending.delete(query));
  pending.set(query, request);
  return request;
}
