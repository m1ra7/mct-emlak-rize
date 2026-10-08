import type { NearbyPlace } from "./nearby";
// Each profile must return genuine route metrics; null means no route.
export function applyRouteMatrix(
  places: NearbyPlace[],
  raw: unknown,
  mode: "walk" | "drive",
) {
  const data = raw as {
    durations?: unknown[][];
    distances?: unknown[][];
    code?: string;
  };
  if (!data || (data.code !== undefined && data.code !== "Ok")) return;
  places.forEach((p, i) => {
    const seconds = data.durations?.[0]?.[i],
      meters = data.distances?.[0]?.[i];
    if (
      typeof seconds !== "number" ||
      typeof meters !== "number" ||
      !Number.isFinite(seconds) ||
      !Number.isFinite(meters) ||
      seconds < 0 ||
      meters < 0
    )
      return;
    if (mode === "walk") {
      p.walkMinutes = Math.max(1, Math.ceil(seconds / 60));
      p.walkDistance = Math.round(meters);
    } else {
      p.driveMinutes = Math.max(1, Math.ceil(seconds / 60));
      p.driveDistance = Math.round(meters);
    }
  });
}
export async function addRoutes(
  places: NearbyPlace[],
  lat: number,
  lon: number,
) {
  const locations = [[lon, lat], ...places.map((p) => [p.lon, p.lat])];
  const destinations = places.map((_, i) => String(i + 1));
  await Promise.allSettled(
    (["walk", "drive"] as const).map(async (mode) => {
      let response: Response;
      if (process.env.ORS_API_KEY) {
        response = await fetch(
          `${(process.env.ORS_URL || "https://api.openrouteservice.org").replace(/\/$/, "")}/v2/matrix/${mode === "walk" ? "foot-walking" : "driving-car"}`,
          {
            method: "POST",
            headers: {
              Authorization: process.env.ORS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              locations,
              sources: ["0"],
              destinations,
              metrics: ["duration", "distance"],
              units: "m",
            }),
            signal: AbortSignal.timeout(10000),
            cache: "no-store",
          },
        );
      } else {
        const base =
          mode === "walk"
            ? process.env.OSRM_FOOT_URL
            : process.env.OSRM_URL || "https://router.project-osrm.org";
        if (!base) return; // The public car server cannot calculate walking routes.
        response = await fetch(
          `${base.replace(/\/$/, "")}/table/v1/${mode === "walk" ? "walking" : "driving"}/${locations.map((x) => x.join(",")).join(";")}?sources=0&destinations=${destinations.join(";")}&annotations=duration,distance`,
          { signal: AbortSignal.timeout(10000), cache: "no-store" },
        );
      }
      if (response.ok) applyRouteMatrix(places, await response.json(), mode);
    }),
  );
}
