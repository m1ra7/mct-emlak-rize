import { parseNearby, type NearbyPlace } from "./nearby";
import type { NearbySnapshot } from "./nearby-provider";
const groups = [
  [
    "highway:bus_stop",
    "public_transport:platform",
    "railway:station",
    "amenity:bus_station",
  ],
  [
    "amenity:school",
    "amenity:university",
    "amenity:college",
    "amenity:kindergarten",
  ],
  ["amenity:hospital", "amenity:clinic", "amenity:pharmacy", "amenity:doctors"],
  ["shop:supermarket", "shop:convenience", "shop:greengrocer", "shop:bakery"],
  ["amenity:cafe", "amenity:restaurant", "amenity:fast_food"],
  [
    "tourism:museum",
    "tourism:gallery",
    "amenity:library",
    "amenity:arts_centre",
    "amenity:community_centre",
  ],
  [
    "leisure:sports_centre",
    "leisure:fitness_centre",
    "leisure:park",
    "leisure:pitch",
  ],
  ["amenity:place_of_worship"],
];
export async function photonNearby(
  lat: number,
  lon: number,
  options: {
    endpoint: string;
    agent?: string;
    fetcher?: typeof fetch;
  },
): Promise<NearbySnapshot> {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error("Geçersiz konum.");
  const points = new Map<string, NearbyPlace>();
  let succeeded = 0;
  // A separate OSM search index remains useful when Overpass instances are unavailable.
  // Two requests at a time, cached by coordinates on the server.
  for (let start = 0; start < groups.length; start += 2) {
    await Promise.all(
      groups.slice(start, start + 2).map(async (tags) => {
        try {
          const url = new URL(options.endpoint);
          url.search = new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
            radius: "5",
            limit: "20",
          }).toString();
          for (const tag of tags) url.searchParams.append("osm_tag", tag);
          const response = await (options.fetcher || fetch)(url, {
            headers: { "User-Agent": options.agent || "MCT-Emlak/nearby" },
            signal: AbortSignal.timeout(8000),
            cache: "no-store",
          });
          if (!response.ok) return;
          const raw = await response.json();
          if (!Array.isArray(raw?.features)) return;
          const elements = raw.features.flatMap(
            (feature: {
              geometry?: { type?: string; coordinates?: unknown[] };
              properties?: Record<string, unknown>;
            }) => {
              const p = feature.properties,
                c = feature.geometry?.coordinates;
              if (
                !p ||
                feature.geometry?.type !== "Point" ||
                !c ||
                typeof c[0] !== "number" ||
                typeof c[1] !== "number" ||
                typeof p.osm_id !== "number" ||
                typeof p.osm_key !== "string" ||
                typeof p.osm_value !== "string"
              )
                return [];
              const type = { N: "node", W: "way", R: "relation" }[
                String(p.osm_type)
              ];
              if (!type) return [];
              return [
                {
                  type,
                  id: p.osm_id,
                  lat: c[1],
                  lon: c[0],
                  tags: {
                    [p.osm_key]: p.osm_value,
                    ...(typeof p.name === "string" ? { name: p.name } : {}),
                  },
                },
              ];
            },
          );
          for (const place of parseNearby({ elements }, lat, lon, Infinity))
            points.set(place.id, place);
          succeeded++;
        } catch {
          /* Preserve categories that returned genuine data. */
        }
      }),
    );
  }
  if (!succeeded || (!points.size && succeeded < groups.length))
    throw new Error("Alternatif yakın çevre servisi yanıt vermiyor.");
  return {
    places: [...points.values()].sort((a, b) => a.distance - b.distance),
    fetchedAt: new Date().toISOString(),
    limitedCategories: [],
    limitedCoverage: true,
  };
}
