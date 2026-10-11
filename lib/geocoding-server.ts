import { unstable_cache } from "next/cache";
import { limit, HttpError } from "./security";
import { geocodeRequest } from "./geocoding-provider";
import {
  automaticPlace,
  type AddressContext,
  type GeocodedPlace,
} from "./geocoding";
import { photonRequest } from "./photon-provider";
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
  async (query: string, context?: AddressContext) => {
    const agent = `MCT-Emlak/2.0 (${process.env.NEXT_PUBLIC_APP_URL || "local development"}; ${process.env.ADMIN_EMAIL || "owner"})`;
    let places: GeocodedPlace[] | undefined;
    let failure: unknown;
    try {
      places = await geocodeRequest(query, {
        endpoint:
          process.env.NOMINATIM_URL ||
          "https://nominatim.openstreetmap.org/search",
        agent,
        throttle,
        context,
      });
    } catch (error) {
      failure = error;
    }
    if (
      places?.length &&
      (!context || automaticPlace(places, context.address, context))
    )
      return places;
    try {
      const backup = await photonRequest(query, {
        endpoint: process.env.PHOTON_URL || "https://photon.komoot.io/api/",
        agent,
        throttle,
        context,
      });
      const seen = new Set<string>();
      return [...backup, ...(places || [])]
        .filter((p) => {
          const key = `${p.latitude},${p.longitude}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 10);
    } catch {
      if (places) return places; // Keep useful suggestions if only the backup is unavailable.
      if (failure instanceof HttpError) throw failure;
      throw new HttpError(
        503,
        "Adres servisleri şu anda yanıt vermiyor. Biraz sonra tekrar deneyin veya haritada binaya dokunarak iğne yerleştirin.",
      );
    }
  },
  [
    "mct-address-search-v7",
    process.env.NOMINATIM_URL || "default",
    process.env.PHOTON_URL || "default",
  ],
  { revalidate: 86400 },
);
// Share concurrent blur/button/save requests for the same address.
const pending = new Map<string, Promise<GeocodedPlace[]>>();
export function lookupAddress(query: string, context?: AddressContext) {
  const signature = JSON.stringify([query, context]);
  const current = pending.get(signature);
  if (current) return current;
  const request = cachedLookup(query, context).finally(() =>
    pending.delete(signature),
  );
  pending.set(signature, request);
  return request;
}
