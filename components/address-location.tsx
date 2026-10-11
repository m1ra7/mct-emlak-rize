"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { request } from "./widgets";
import { listingMap } from "@/lib/listing-map";
import { automaticPlace, type GeocodedPlace } from "@/lib/geocoding";
export function AddressLocation({
  initialLatitude,
  initialLongitude,
  initialApproximate,
  onBusyChange,
}: {
  initialLatitude?: string | null;
  initialLongitude?: string | null;
  initialApproximate?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [latitude, setLatitude] = useState(initialLatitude || "");
  const [longitude, setLongitude] = useState(initialLongitude || "");
  const [approximate, setApproximate] = useState(initialApproximate || false);
  const [places, setPlaces] = useState<GeocodedPlace[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const preview = useRef<GeocodedPlace | null>(null);
  const syncPicker = useCallback(() => {
    const target = picker.current?.contentWindow;
    if (approximate && latitude && longitude)
      target?.postMessage(
        {
          type: "mct-preview-location",
          latitude,
          longitude,
        },
        window.location.origin,
      );
    else
      target?.postMessage(
        { type: "mct-set-location", latitude, longitude },
        window.location.origin,
      );
  }, [latitude, longitude, approximate]);
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
        neighborhoodId: data.get("neighborhoodId") || null,
      });
      if (token !== revision.current) return;
      const found: GeocodedPlace[] = result.places;
      setPlaces(found);
      const point = automaticPlace(found, address, result.context);
      preview.current = null;
      if (point) {
        setLatitude(point.latitude);
        setLongitude(point.longitude);
        setApproximate(!point.precise);
        if (!point.precise) preview.current = point;
        setNotice(
          point.precise
            ? "Adres bulundu. İğneyi sürükleyerek konumu hassaslaştırabilirsiniz."
            : "Bina konumu kesinleşmedi. Yaklaşık bölge daireyle işaretlendi; isterseniz haritadan iğneyle netleştirin.",
        );
      } else {
        preview.current = found.find((p) => p.street) || found[0] || null;
        setLatitude(preview.current?.latitude || "");
        setLongitude(preview.current?.longitude || "");
        setApproximate(Boolean(preview.current));
        if (preview.current)
          picker.current?.contentWindow?.postMessage(
            {
              type: "mct-preview-location",
              latitude: preview.current.latitude,
              longitude: preview.current.longitude,
            },
            window.location.origin,
          );
        setNotice(
          found.length
            ? "Bina noktası kesin doğrulanamadı. Yaklaşık alan daireyle işaretlendi; haritaya dokunarak iğneyle netleştirebilirsiniz."
            : "Adres bulunamadı. Sokak ve bina numarasını kontrol edin veya haritada iğne yerleştirin.",
        );
      }
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
      if (event.data?.type === "mct-map-ready") syncPicker();
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
        preview.current = null;
        setBusy(false);
        setLatitude(lat.toFixed(7));
        setLongitude(lng.toFixed(7));
        setApproximate(false);
        setNotice("İğne yerleştirildi. Konumu kaydetmek için ilanı kaydedin.");
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [syncPicker]);
  useEffect(() => {
    syncPicker();
  }, [syncPicker]);
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
      preview.current = null;
      setBusy(false);
      setLatitude("");
      setLongitude("");
      setApproximate(false);
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
      ? listingMap({
          address: "",
          city: "",
          district: "",
          latitude,
          longitude,
          approximate,
        })
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
                preview.current = place.precise ? null : place;
                if (place.precise) {
                  setLatitude(place.latitude);
                  setLongitude(place.longitude);
                  setApproximate(false);
                  setNotice(
                    "Adres noktası seçildi. İşaretçiyi kontrol edip ilanı kaydedin.",
                  );
                } else {
                  setLatitude(place.latitude);
                  setLongitude(place.longitude);
                  setApproximate(true);
                  picker.current?.contentWindow?.postMessage(
                    {
                      type: "mct-preview-location",
                      latitude: place.latitude,
                      longitude: place.longitude,
                    },
                    window.location.origin,
                  );
                  setNotice(
                    "Yaklaşık bölge daireyle işaretlendi. İsterseniz binanın bulunduğu yere dokunarak kesin iğne yerleştirin.",
                  );
                }
              }}
            >
              <MapPin size={18} />
              <span>
                {place.name}
                <small className="quiet">
                  {place.precise
                    ? "Bina / adres noktası"
                    : place.street
                      ? "Sokak merkezi — bina konumunu kontrol edin"
                      : "Bölge — kesin bina konumu değildir"}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <input
        type="hidden"
        name="locationApproximate"
        value={approximate ? "true" : "false"}
      />
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
