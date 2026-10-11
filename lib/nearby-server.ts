import { photonNearby } from "./nearby-photon";
import { unstable_cache } from "next/cache";
import { limit, HttpError } from "./security";
import { addRoutes } from "./nearby-routing";
import { nearbyVisible } from "./nearby";
import {
  defaultOverpassEndpoints,
  nearbyRequest,
  type NearbySnapshot,
} from "./nearby-provider";
const endpoints = () =>
  process.env.OVERPASS_URL
    ? [
        process.env.OVERPASS_URL,
        ...(process.env.OVERPASS_FALLBACK_URLS
          ? process.env.OVERPASS_FALLBACK_URLS.split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : defaultOverpassEndpoints),
      ]
    : defaultOverpassEndpoints;
async function throttle() {
  for (let attempt = 0; ; attempt++) {
    try {
      await limit("nearby-global-v3", 1, 2);
      return;
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 429 || attempt >= 3)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 2100));
    }
  }
}
const photonEndpoint = () =>
  process.env.PHOTON_REVERSE_URL || "https://photon.komoot.io/reverse";
class PartialNearbyError extends Error {
  constructor(readonly snapshot: NearbySnapshot) {
    super("Partial nearby response");
  }
}
const cachedNearby = unstable_cache(
  async (lat: number, lon: number) => {
    await throttle();
    try {
      const snapshot = await nearbyRequest(lat, lon, {
        endpoints: endpoints(),
        agent: `MCT-Emlak/2.0 (${process.env.NEXT_PUBLIC_APP_URL || "local development"})`,
      });
      if (snapshot.partial) throw new PartialNearbyError(snapshot);
      return snapshot;
    } catch (error) {
      try {
        const backup = await photonNearby(lat, lon, {
          endpoint: photonEndpoint(),
          agent: `MCT-Emlak/2.0 (${process.env.NEXT_PUBLIC_APP_URL || "local development"})`,
        });
        if (error instanceof PartialNearbyError) {
          const combined = new Map(
            [...error.snapshot.places, ...backup.places].map((p) => [p.id, p]),
          );
          backup.places = [...combined.values()].sort(
            (a, b) => a.distance - b.distance,
          );
        }
        return backup;
      } catch {
        /* A partial Overpass result is still preferable to an outage. */
      }
      if (error instanceof PartialNearbyError) throw error;
      throw new HttpError(
        503,
        error instanceof Error ? error.message : "Yakın çevre yüklenemedi.",
      );
    }
  },
  ["nearby-osm-v6", ...endpoints(), photonEndpoint()],
  { revalidate: 900 },
);
const pending = new Map<string, Promise<NearbySnapshot>>();
export function findNearby(lat: number, lon: number) {
  const key = `${lat},${lon}`;
  const current = pending.get(key);
  if (current) return current;
  const request = cachedNearby(lat, lon)
    .catch((error) => {
      if (error instanceof PartialNearbyError) return error.snapshot;
      throw error;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
export const nearbyRoutes = unstable_cache(
  async (lat: number, lon: number, category: string, count: number) => {
    const snapshot = await findNearby(lat, lon);
    // Copy cached objects: one category's route results must not mutate another request.
    const places = nearbyVisible(snapshot.places, category, count).map((p) => ({
      ...p,
    }));
    if (places.length) await addRoutes(places, lat, lon);
    return places;
  },
  [
    "nearby-routes-v6",
    process.env.ORS_API_KEY ? "ors" : "osrm",
    process.env.ORS_URL || "",
    process.env.OSRM_FOOT_URL || "",
    process.env.OSRM_URL || "",
  ],
  { revalidate: 21600 },
);
