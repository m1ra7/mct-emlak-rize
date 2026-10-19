// The map iframe receives the same selected language as the listing page.
const dictionaries = {
  en: {
    "kuş uçuşu": "straight-line distance",
    Ulaşım: "Transport",
    Eğitim: "Education",
    Sağlık: "Healthcare",
    Market: "Groceries",
    "Kafe & Restoran": "Cafés & Restaurants",
    "Kültür & Sanat": "Culture & Arts",
    Spor: "Sports",
    İbadet: "Places of worship",
    "İlan konumunu seçin": "Choose the property location",
    "İlan konumunu seçmek için harita":
      "Map for choosing the property location",
    "Dairenin bulunduğu noktaya dokunun.": "Tap the property’s location.",
    "Haritayı taşı": "Move map",
    "Sayfayı kaydır": "Scroll page",
    "Harita yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.":
      "The map could not be loaded. Check your connection and refresh the page.",
    Yakınlaştır: "Zoom in",
    Uzaklaştır: "Zoom out",
    "Kuzeye dön": "Reset bearing to north",
    "İlanın yaklaşık bulunduğu bölge daire içinde gösteriliyor.":
      "The circle shows the approximate property location.",
    "İlan konumu": "Property location",
    "İlanın kaydedilen konumu": "Saved property location",
    "İğne seçildi. İlanı kaydederek konumu saklayın.":
      "Pin selected. Save the property to keep this location.",
    "Yaklaşık bölge daire içinde gösteriliyor. Binanın bulunduğu noktaya dokunarak iğne yerleştirin.":
      "The circle shows the approximate area. Tap the building’s location to place a pin.",
    "Harita katmanı yüklenemedi. Bağlantınızı kontrol edin; kayıtlı koordinatlar korunur.":
      "The map layer could not be loaded. Check your connection; saved coordinates are preserved.",
  },
  de: {
    "kuş uçuşu": "Luftlinie",
    Ulaşım: "Verkehr",
    Eğitim: "Bildung",
    Sağlık: "Gesundheit",
    Market: "Lebensmittel",
    "Kafe & Restoran": "Cafés & Restaurants",
    "Kültür & Sanat": "Kultur & Kunst",
    Spor: "Sport",
    İbadet: "Gotteshäuser",
    "İlan konumunu seçin": "Immobilienstandort auswählen",
    "İlan konumunu seçmek için harita":
      "Karte zur Auswahl des Immobilienstandorts",
    "Dairenin bulunduğu noktaya dokunun.":
      "Tippen Sie auf den Standort der Immobilie.",
    "Haritayı taşı": "Karte bewegen",
    "Sayfayı kaydır": "Seite scrollen",
    "Harita yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.":
      "Die Karte konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und laden Sie die Seite neu.",
    Yakınlaştır: "Vergrößern",
    Uzaklaştır: "Verkleinern",
    "Kuzeye dön": "Nach Norden ausrichten",
    "İlanın yaklaşık bulunduğu bölge daire içinde gösteriliyor.":
      "Der Kreis zeigt die ungefähre Lage der Immobilie.",
    "İlan konumu": "Immobilienstandort",
    "İlanın kaydedilen konumu": "Gespeicherter Immobilienstandort",
    "İğne seçildi. İlanı kaydederek konumu saklayın.":
      "Markierung gesetzt. Speichern Sie das Angebot, um den Standort zu übernehmen.",
    "Yaklaşık bölge daire içinde gösteriliyor. Binanın bulunduğu noktaya dokunarak iğne yerleştirin.":
      "Der Kreis zeigt die ungefähre Lage. Tippen Sie auf den Gebäudestandort, um eine Markierung zu setzen.",
    "Harita katmanı yüklenemedi. Bağlantınızı kontrol edin; kayıtlı koordinatlar korunur.":
      "Die Kartenebene konnte nicht geladen werden. Prüfen Sie Ihre Verbindung; gespeicherte Koordinaten bleiben erhalten.",
  },
};
const requested = new URLSearchParams(location.search).get("lang");
const language = requested === "en" || requested === "de" ? requested : "tr";
export const mapLocale =
  language === "en" ? "en-GB" : language === "de" ? "de-DE" : "tr-TR";
export const mapTr = (key) => dictionaries[language]?.[key] || key;
document.documentElement.lang = language;
document.title = mapTr("İlan konumunu seçin");
for (const id of ["hint", "pan", "error"]) {
  const node = document.getElementById(id);
  if (node)
    node.textContent = mapTr(node.textContent.replace(/\s+/g, " ").trim());
}
document
  .getElementById("map")
  ?.setAttribute("aria-label", mapTr("İlan konumunu seçmek için harita"));
