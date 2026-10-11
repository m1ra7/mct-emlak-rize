import {
  parseNearby,
  nearbyCategories,
  nearbyResultLimit,
  type NearbyPlace,
} from "./nearby";
export type NearbySnapshot = {
  places: NearbyPlace[];
  fetchedAt: string;
  limitedCategories: string[];
  partial?: boolean;
  limitedCoverage?: boolean;
};
export const defaultOverpassEndpoints = [
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
export function nearbyQuery(lat: number, lon: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error("Geçersiz ilan konumu.");
  const around = `(around:5000,${lat},${lon})`;
  return `[out:json][timeout:10];(nwr${around}[amenity~"^(bus_station|taxi|ferry_terminal|school|university|college|kindergarten|language_school|hospital|clinic|doctors|dentist|pharmacy|cafe|restaurant|fast_food|food_court|cinema|theatre|arts_centre|community_centre|library|place_of_worship)$"];nwr${around}[shop~"^(supermarket|convenience|greengrocer|bakery|mall|department_store|deli)$"];nwr${around}[tourism~"^(museum|gallery|artwork)$"];nwr${around}[leisure~"^(sports_centre|fitness_centre|stadium|pitch|swimming_pool|park|sports_hall|fitness_station)$"];nwr${around}[public_transport~"^(platform|station|stop_position)$"];nwr${around}[highway=bus_stop];nwr${around}[railway~"^(station|halt|tram_stop|subway_entrance)$"];nwr${around}[healthcare];);out center tags;`;
}
const cooldown = new Map<string, number>();
export async function nearbyRequest(
  lat: number,
  lon: number,
  options: {
    endpoints?: string[];
    fetcher?: typeof fetch;
    agent?: string;
  } = {},
): Promise<NearbySnapshot> {
  const query = nearbyQuery(lat, lon);
  const endpoints = [...new Set(options.endpoints || defaultOverpassEndpoints)];
  let partial: NearbySnapshot | undefined;
  const deadline = Date.now() + 16000;
  for (const endpoint of endpoints) {
    if (Date.now() >= deadline) break;
    if ((cooldown.get(endpoint) || 0) > Date.now()) continue;
    try {
      const response = await (options.fetcher || fetch)(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(12000, deadline - Date.now())),
        ),
        headers: { "User-Agent": options.agent || "MCT-Emlak/nearby" },
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 429 || response.status === 406)
          cooldown.set(endpoint, Date.now() + 30000);
        continue;
      }
      const body = await response.json();
      // Overpass can return HTTP 200 with a timeout remark and only part of the data.
      if (!Array.isArray(body?.elements)) continue;
      const all = parseNearby(body, lat, lon, Infinity);
      const counts = new Map<string, number>();
      const places = all.filter((p) => {
        const count = counts.get(p.category) || 0;
        counts.set(p.category, count + 1);
        return count < nearbyResultLimit;
      });
      const snapshot: NearbySnapshot = {
        places,
        fetchedAt: new Date().toISOString(),
        limitedCategories: nearbyCategories.filter(
          (c) => (counts.get(c) || 0) > nearbyResultLimit,
        ),
      };
      if (!body.remark) return snapshot;
      // Preserve genuine results when every fallback fails, but label them incomplete.
      if (places.length && (!partial || places.length > partial.places.length))
        partial = { ...snapshot, partial: true };
    } catch {
      /* A failed instance must not discard the other provider's results. */
    }
  }
  if (partial) return partial;
  throw new Error(
    "Yakın çevre servisleri şu anda yanıt vermiyor. Konumunuz korunuyor; biraz sonra tekrar deneyin.",
  );
}
