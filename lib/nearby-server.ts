import { unstable_cache } from "next/cache";
import { limit, HttpError } from "./security";
import { addRoutes } from "./nearby-routing";
import { parseNearby } from "./nearby";
export const findNearby = unstable_cache(
  async (lat: number, lon: number) => {
    await limit("nearby-global", 1, 2);
    const around = `(around:5000,${lat},${lon})`;
    const query = `[out:json][timeout:15];(nwr${around}[amenity];nwr${around}[shop~"supermarket|convenience|greengrocer|bakery"];nwr${around}[tourism~"museum|gallery"];nwr${around}[leisure~"sports_centre|fitness_centre|stadium|pitch|swimming_pool|park"];nwr${around}[public_transport];nwr${around}[highway=bus_stop];nwr${around}[railway=station];nwr${around}[healthcare];);out center;`;
    const response = await fetch(
      process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20000),
        headers: { "User-Agent": "MCT-Emlak nearby/1.0" },
        cache: "no-store",
      },
    );
    if (!response.ok)
      throw new HttpError(
        503,
        "Yakın çevre servisine şu anda ulaşılamıyor. Tekrar deneyin.",
      );
    const places = parseNearby(await response.json(), lat, lon);
    // Keep the nearest points in every category rather than letting cafes crowd out schools.
    const counts = new Map<string, number>();
    const selected = places.filter((p) => {
      const count = counts.get(p.category) || 0;
      counts.set(p.category, count + 1);
      return count < 3;
    });
    if (selected.length) await addRoutes(selected, lat, lon);
    return places;
  },
  [
    "nearby-osm-v2",
    process.env.ORS_API_KEY ? "ors" : "osrm",
    process.env.ORS_URL || "",
    process.env.OSRM_FOOT_URL || "",
    process.env.OSRM_URL || "",
    process.env.OVERPASS_URL || "",
  ],
  { revalidate: 86400 },
);
