export function isLandType(type: { slug?: string; name?: string } | undefined) {
  return /(^|[\s-])(arsa|arazi|tarla)([\s-]|$)/i.test(
    `${type?.slug || ""} ${(type?.name || "").toLocaleLowerCase("tr-TR")}`,
  );
}
export const landFields = [
  "roomCount",
  "buildingAge",
  "floor",
  "totalFloors",
  "heatingType",
  "bathroomCount",
] as const;
export const zoningOptions = [
  "Belirtilmemiş",
  "Konut imarlı",
  "Ticari imarlı",
  "Konut + ticari imarlı",
  "Sanayi imarlı",
  "Turizm imarlı",
  "İmarsız",
  "Tarla / tarım arazisi",
] as const;

export function isRentalApartment(
  listingType: string,
  type: { slug?: string; name?: string } | undefined,
) {
  return (
    listingType === "kiralik" &&
    (type?.slug === "daire" ||
      type?.name?.trim().toLocaleLowerCase("tr-TR") === "daire")
  );
}
