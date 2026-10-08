import { landFields } from "./property-kind";
import { z } from "zod";
export const uuid = z.string().uuid();
// Accept plain numbers and the grouped Turkish price format used by owners.
export function listingNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim().replace(/\s/g, "");
  if (!text) return value; // Required empty fields must never become zero.
  if (/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text))
    return Number(text.replaceAll(".", "").replace(",", "."));
  if (/^-?\d+(,\d+)?$/.test(text)) return Number(text.replace(",", "."));
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return value;
}
const coordinate = (min: number, max: number) =>
  z
    .preprocess(
      (value) => (value === "" || value == null ? null : listingNumber(value)),
      z.number().min(min).max(max).nullable(),
    )
    .optional();
export const listingInput = z
  .object({
    title: z.string().trim().min(10).max(180),
    description: z.string().trim().min(30).max(12000),
    price: z.preprocess(
      listingNumber,
      z.number().nonnegative().max(999999999999),
    ),
    listingType: z.enum(["satilik", "kiralik"]),
    propertyTypeId: uuid,
    cityId: uuid,
    districtId: uuid,
    neighborhoodId: z.preprocess(
      (v) => (v === "" ? null : v),
      uuid.nullable().optional(),
    ),
    address: z.string().trim().min(5).max(500),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
    isLand: z.boolean().default(false),
    roomCount: z.string().min(1).max(20).optional(),
    areaM2: z.preprocess(
      (value) => (value === "" || value == null ? null : listingNumber(value)),
      z.number().int().positive().max(10000000).nullable(),
    ),
    buildingAge: z
      .preprocess(listingNumber, z.number().int().min(0).max(300))
      .optional(),
    floor: z
      .preprocess(listingNumber, z.number().int().min(-10).max(200))
      .optional(),
    totalFloors: z
      .preprocess(listingNumber, z.number().int().min(1).max(200))
      .optional(),
    heatingType: z.string().min(1).max(80).optional(),
    bathroomCount: z
      .preprocess(listingNumber, z.number().int().min(0).max(100))
      .optional(),
    balcony: z.boolean(),
    elevator: z.boolean(),
    parking: z.boolean(),
    furnished: z.boolean(),
    complex: z.boolean(),
    seaView: z.boolean(),
    status: z.enum(["draft", "pending", "published", "archived"]).optional(),
    featured: z.boolean().optional(),
    features: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          value: z.string().trim().min(1).max(1600),
        }),
      )
      .max(30)
      .default([]),
  })
  .superRefine((v, c) => {
    for (const feature of v.features) {
      if (
        feature.name === "WC Sayısı" &&
        (!/^\d+$/.test(feature.value) || Number(feature.value) > 100)
      )
        c.addIssue({
          code: "custom",
          message: "WC sayısı 0–100 arasında tam sayı olmalı.",
          path: ["wcCount"],
        });
    }
    if (
      v.price === 0 &&
      !(
        v.isLand &&
        v.features.some((f) => f.name === "Kat karşılığı" && f.value === "Evet")
      )
    )
      c.addIssue({
        code: "custom",
        message: "Fiyat sıfırdan büyük olmalı.",
        path: ["price"],
      });
    if ((v.latitude == null) !== (v.longitude == null))
      c.addIssue({
        code: "custom",
        message: "Koordinatlar birlikte girilmeli",
        path: ["latitude"],
      });
    if (!v.isLand)
      for (const key of landFields) {
        if (v[key] === undefined)
          c.addIssue({
            code: "custom",
            message: "Bu alan konut ilanlarında zorunludur.",
            path: [key],
          });
      }
    if (
      !v.isLand &&
      v.floor !== undefined &&
      v.totalFloors !== undefined &&
      v.floor > v.totalFloors
    )
      c.addIssue({
        code: "custom",
        message: "Kat bilgisi geçersiz",
        path: ["floor"],
      });
  });
export const messageInput = z.object({
  listingId: uuid,
  body: z.string().trim().min(1).max(3000),
  recipientId: z.string().min(1).optional(),
});
export function slugify(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
