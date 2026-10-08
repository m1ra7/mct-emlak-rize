"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { request } from "./widgets";
import { listingMap } from "@/lib/listing-map";
import { automaticPlace, type GeocodedPlace } from "@/lib/geocoding";
export function AddressLocation({
  initialLatitude,
  initialLongitude,
  onBusyChange,
}: {
  initialLatitude?: string | null;
  initialLongitude?: string | null;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [latitude, setLatitude] = useState(initialLatitude || "");
  const [longitude, setLongitude] = useState(initialLongitude || "");
  const [places, setPlaces] = useState<GeocodedPlace[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const revision = useRef(0);
  const searched = useRef("");
  const searchAddress = useCallback(async (force = false) => {
    const form = root.current?.closest("form");
    if (!form) return;
    const data = new FormData(form);
    const address = String(data.get("address") || "").trim();
    if (address.length < 5 || !data.get("cityId") || !data.get("districtId")) {
      if (force)
        setNotice(
          "İl ve ilçeyi seçin; açık adresi en az 5 karakter olarak yazın.",
        );
      return;
    }
    const signature = JSON.stringify([
      address,
      data.get("cityId"),
      data.get("districtId"),
      data.get("neighborhoodId"),
    ]);
    if (!force && searched.current === signature) return;
    searched.current = signature;
    const token = ++revision.current;
    setBusy(true);
    setNotice("Adres haritada aranıyor…");
    try {
      const result = await request("geocode", "POST", {
        address,
        cityId: data.get("cityId"),
        districtId: data.get("districtId"),
      });
      if (token !== revision.current) return;
      const found: GeocodedPlace[] = result.places;
      setPlaces(found);
      const point = automaticPlace(found, address);
      if (point) {
        setLatitude(point.latitude);
        setLongitude(point.longitude);
        setNotice(
          point.precise
            ? "Adres bulundu. İğneyi sürükleyerek konumu hassaslaştırabilirsiniz."
            : "Sokak konumu bulundu. Bina için iğneyi doğru noktaya sürükleyin.",
        );
      } else
        setNotice(
          found.length
            ? "Adres için bulunan sonuçlardan doğru olanı seçin. Bina konumunu iğneyle kontrol edin."
            : "Adres bulunamadı. Sokak ve bina numarasını kontrol edin veya haritada iğne yerleştirin.",
        );
    } catch (error) {
      if (token === revision.current) {
        searched.current = "";
        setNotice(error instanceof Error ? error.message : "Konum bulunamadı.");
      }
    } finally {
      if (token === revision.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== picker.current?.contentWindow
      )
        return;
      if (event.data?.type === "mct-map-ready") {
        picker.current?.contentWindow?.postMessage(
          { type: "mct-set-location", latitude, longitude },
          window.location.origin,
        );
      }
      if (event.data?.type === "mct-location") {
        const { lat, lng } = event.data;
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180
        )
          return;
        ++revision.current;
        setBusy(false);
        setLatitude(lat.toFixed(7));
        setLongitude(lng.toFixed(7));
        setNotice("İğne yerleştirildi. Konumu kaydetmek için ilanı kaydedin.");
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [latitude, longitude]);
  function syncPicker() {
    picker.current?.contentWindow?.postMessage(
      { type: "mct-set-location", latitude, longitude },
      window.location.origin,
    );
  }
  useEffect(() => {
    picker.current?.contentWindow?.postMessage(
      { type: "mct-set-location", latitude, longitude },
      window.location.origin,
    );
  }, [latitude, longitude]);
  useEffect(() => {
    const form = root.current?.closest("form");
    const pendingRevision = revision;
    if (!form) return;
    function invalidate(event: Event) {
      const target = event.target;
      if (!(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ))
        return;
      if (
        !["address", "cityId", "districtId", "neighborhoodId"].includes(
          target.name,
        )
      )
        return;
      ++revision.current;
      searched.current = "";
      setBusy(false);
      setLatitude("");
      setLongitude("");
      setPlaces([]);
      setNotice("Adres tamamlanınca konum otomatik aranacak.");
    }
    function completed(event: Event) {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === "address") {
        // Clicking Search must not first start another lookup on blur.
        if (
          event instanceof FocusEvent &&
          event.relatedTarget instanceof HTMLElement &&
          root.current?.contains(event.relatedTarget)
        )
          return;
        void searchAddress();
      }
      if (
        target instanceof HTMLSelectElement &&
        ["cityId", "districtId", "neighborhoodId"].includes(target.name)
      )
        void searchAddress();
    }
    form.addEventListener("focusout", completed);
    form.addEventListener("input", invalidate);
    form.addEventListener("change", invalidate);
    form.addEventListener("change", completed);
    return () => {
      ++pendingRevision.current;
      form.removeEventListener("focusout", completed);
      form.removeEventListener("change", completed);
      form.removeEventListener("input", invalidate);
      form.removeEventListener("change", invalidate);
    };
  }, [searchAddress]);

  const map =
    latitude && longitude
      ? listingMap({ address: "", city: "", district: "", latitude, longitude })
      : null;
  return (
    <div className="span address-location" ref={root}>
      <h3>
        <MapPin size={20} /> Harita konumu
      </h3>
      <p className="quiet">
        Açık adresi yazıp alanın dışına tıklayın; konum otomatik aranır. Bulunan
        adresi seçin, gerekirse iğneyi sürükleyerek düzeltin.
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => void searchAddress(true)}
      >
        <Search size={18} />
        {busy ? "Adres aranıyor…" : "Adresten konum bul"}
      </button>
      {notice && (
        <p className="alert" role="status">
          {notice}
        </p>
      )}
      {places.length > 0 && (
        <div className="location-results">
          {places.map((place, index) => (
            <button
              type="button"
              className="location-result"
              key={`${place.latitude}-${place.longitude}-${index}`}
              onClick={() => {
                ++revision.current;
                setBusy(false);
                setLatitude(place.latitude);
                setLongitude(place.longitude);
                setNotice(
                  "Konum seçildi. İşaretçiyi kontrol edip ilanı kaydedin.",
                );
              }}
            >
              <MapPin size={18} />
              <span>{place.name}</span>
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <iframe
        ref={picker}
        className="listing-map"
        title="İlanın konumunu iğneyle seçin"
        src="/map-picker.html"
        loading="lazy"
        onLoad={syncPicker}
      />
      {map && !map.approximate && (
        <>
          <a
            className="text-link"
            href={map.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            İşaretçiyi büyük haritada kontrol et
          </a>
        </>
      )}
      <p className="quiet map-attribution">
        Harita ve adres verisi:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap katkıda bulunanlar
        </a>
      </p>
    </div>
  );
}
