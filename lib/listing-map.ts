export function listingMap(input: {
  address: string;
  city: string;
  district: string;
  latitude: string | null;
  longitude: string | null;
}) {
  const latitude = input.latitude === null ? NaN : Number(input.latitude);
  const longitude = input.longitude === null ? NaN : Number(input.longitude);
  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  ) {
    return {
      embed: `/map-picker.html?readonly=1&lat=${latitude}&lon=${longitude}&marker=${latitude}%2C${longitude}`,
      link: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
      label: "Haritada aç",
      approximate: false,
    };
  }
  const query = [input.address, input.district, input.city, "Türkiye"]
    .filter(Boolean)
    .join(", ");
  return {
    embed: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`,
    link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    label: "Adresi haritada aç",
    approximate: true,
  };
}
