export const nearbyCategories = [
  "Tümü",
  "Ulaşım",
  "Eğitim",
  "Sağlık",
  "Market",
  "Kafe & Restoran",
  "Kültür & Sanat",
  "Spor",
  "İbadet",
] as const;
export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distance: number;
  walkMinutes?: number;
  walkDistance?: number;
  driveMinutes?: number;
  driveDistance?: number;
};
export function distanceMeters(lat: number, lon: number, a: number, b: number) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((a - lat) * rad) / 2) ** 2 +
    Math.cos(lat * rad) *
      Math.cos(a * rad) *
      Math.sin(((b - lon) * rad) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))));
}
export function parseNearby(
  raw: unknown,
  lat: number,
  lon: number,
): NearbyPlace[] {
  const elements = (raw as { elements?: unknown[] })?.elements;
  if (!Array.isArray(elements))
    throw new Error("Yakın çevre servisi geçersiz yanıt verdi.");
  const items: NearbyPlace[] = [];
  for (const element of elements) {
    const e = element as {
      id: number;
      type: string;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    };
    const tags = e.tags || {};
    const name = tags["name:tr"] || tags.name;
    const a = e.lat ?? e.center?.lat,
      b = e.lon ?? e.center?.lon;
    if (
      !name ||
      typeof a !== "number" ||
      typeof b !== "number" ||
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      Math.abs(a) > 90 ||
      Math.abs(b) > 180
    )
      continue;
    const amenity = tags.amenity;
    let category = "";
    if (
      tags.public_transport ||
      tags.highway === "bus_stop" ||
      tags.railway === "station" ||
      ["bus_station", "taxi", "ferry_terminal"].includes(amenity)
    )
      category = "Ulaşım";
    else if (
      [
        "school",
        "university",
        "college",
        "kindergarten",
        "language_school",
      ].includes(amenity)
    )
      category = "Eğitim";
    else if (
      tags.healthcare ||
      ["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(amenity)
    )
      category = "Sağlık";
    else if (
      ["supermarket", "convenience", "greengrocer", "bakery"].includes(
        tags.shop,
      )
    )
      category = "Market";
    else if (
      ["cafe", "restaurant", "fast_food", "food_court"].includes(amenity)
    )
      category = "Kafe & Restoran";
    else if (
      [
        "cinema",
        "theatre",
        "arts_centre",
        "community_centre",
        "library",
      ].includes(amenity) ||
      ["museum", "gallery"].includes(tags.tourism)
    )
      category = "Kültür & Sanat";
    else if (
      [
        "sports_centre",
        "fitness_centre",
        "stadium",
        "pitch",
        "swimming_pool",
        "park",
      ].includes(tags.leisure)
    )
      category = "Spor";
    else if (amenity === "place_of_worship") category = "İbadet";
    const distance = distanceMeters(lat, lon, a, b);
    if (
      category &&
      distance <= 5000 &&
      !items.some(
        (x) => x.name === name && distanceMeters(x.lat, x.lon, a, b) < 40,
      )
    )
      items.push({
        id: `${e.type}/${e.id}`,
        name,
        category,
        lat: a,
        lon: b,
        distance,
      });
  }
  const counts = new Map<string, number>();
  return items
    .sort((a, b) => a.distance - b.distance)
    .filter((p) => {
      const count = counts.get(p.category) || 0;
      counts.set(p.category, count + 1);
      return count < 10;
    });
}
