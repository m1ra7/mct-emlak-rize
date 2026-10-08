import { ZodError } from "zod";
const labels: Record<string, string> = {
  title: "İlan başlığı",
  description: "Açıklama",
  price: "Fiyat",
  propertyTypeId: "Gayrimenkul türü",
  cityId: "İl",
  districtId: "İlçe",
  neighborhoodId: "Mahalle",
  address: "Açık adres",
  latitude: "Enlem",
  longitude: "Boylam",
  roomCount: "Oda sayısı",
  areaM2: "Alan",
  buildingAge: "Bina yaşı",
  floor: "Bulunduğu kat",
  totalFloors: "Toplam kat",
  heatingType: "Isıtma",
  bathroomCount: "Banyo sayısı",
  features: "Ek özellikler",
};
export function validationErrors(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] || "form");
    if (fields[key]) continue;
    const label = labels[key] || "Alan";
    let message = "Geçerli bir değer girin.";
    if (issue.code === "too_small")
      message = `En az ${issue.minimum} ${issue.origin === "string" ? "karakter" : "değerinde"} olmalı.`;
    if (issue.code === "too_big")
      message = `En fazla ${issue.maximum} ${issue.origin === "string" ? "karakter" : "değerinde"} olmalı.`;
    if (issue.code === "custom") message = issue.message;
    if (
      ["cityId", "districtId", "propertyTypeId", "neighborhoodId"].includes(key)
    )
      message = "Listeden geçerli bir seçenek seçin.";
    fields[key] = `${label}: ${message}`;
  }
  return fields;
}
