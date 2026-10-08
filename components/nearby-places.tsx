"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type NearbyPlace } from "@/lib/nearby";
import { NearbyCategories } from "./nearby-categories";
import { listingMap } from "@/lib/listing-map";
const formatDistance = (meters: number) =>
  meters < 1000
    ? `${meters} m`
    : `${(meters / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
export function NearbyPlaces({
  id,
  latitude,
  longitude,
  address,
  land = false,
}: {
  id: string;
  latitude: string | null;
  longitude: string | null;
  address: string;
  land?: boolean;
}) {
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [category, setCategory] = useState("Tümü");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const section = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);
  const visible = useMemo(() => {
    const filtered = (places || []).filter(
      (p) => category === "Tümü" || p.category === category,
    );
    if (category !== "Tümü") return filtered.slice(0, 12);
    const counts = new Map<string, number>();
    return filtered.filter((p) => {
      const count = counts.get(p.category) || 0;
      counts.set(p.category, count + 1);
      return count < 3;
    });
  }, [places, category]);
  const sync = useCallback(
    () =>
      frame.current?.contentWindow?.postMessage(
        { type: "mct-pois", points: visible },
        window.location.origin,
      ),
    [visible],
  );
  const load = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/nearby?id=${encodeURIComponent(id)}`, {
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Yakın çevre yüklenemedi.");
      if (!abort.signal.aborted) setPlaces(data.places);
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Yakın çevre yüklenemedi.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    if (latitude === null || longitude === null) return;
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      controller.current?.abort();
    };
  }, [load, latitude, longitude]);
  useEffect(() => {
    sync();
  }, [sync]);
  useEffect(() => {
    function receive(e: MessageEvent) {
      if (
        e.origin !== window.location.origin ||
        e.source !== frame.current?.contentWindow
      )
        return;
      if (e.data?.type === "mct-map-ready") sync();
      if (
        e.data?.type === "mct-poi-selected" &&
        visible.some((p) => p.id === e.data.id)
      )
        setSelected(e.data.id);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [sync, visible]);
  if (latitude === null || longitude === null)
    return (
      <section className="panel nearby-section">
        <h2>Çevrede Neler Var?</h2>
        <p className="quiet">
          Yakındaki yerler için ilan konumu henüz kaydedilmemiş.
        </p>
      </section>
    );
  const map = listingMap({
    address,
    city: "",
    district: "",
    latitude,
    longitude,
  });
  return (
    <section className="panel nearby-section" ref={section} aria-busy={busy}>
      <h2>Konum</h2>
      <p className="quiet">{address}</p>
      <div className="nearby-map-wrap">
        <iframe
          ref={frame}
          className="listing-map"
          title="İlan ve yakın çevredeki yerler"
          src={`${map.embed}&kind=${land ? "land" : "home"}`}
          onLoad={sync}
          loading="lazy"
        />
        <a
          className="text-link"
          href={map.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          İlan konumunu büyük haritada aç
        </a>
      </div>
      <h2>Çevrede Neler Var?</h2>
      <p className="quiet">
        5 km çevresindeki kayıtlı yerler. Rota mesafeleri ve süreleri servis
        verileridir; araç süresi canlı trafiği içermez. Rota bulunamazsa
        yalnızca kuş uçuşu mesafe gösterilir.
      </p>
      <NearbyCategories
        category={category}
        onSelect={(value) => {
          setCategory(value);
          setSelected("");
        }}
      />
      <div className="nearby-list">
        {busy && (
          <p role="status" className="quiet">
            Yakın çevre ve yollar analiz ediliyor…
          </p>
        )}
        {error && (
          <div role="alert">
            <p className="alert">{error}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => void load()}
              disabled={busy}
            >
              Tekrar dene
            </button>
          </div>
        )}
        {visible.map((p) => (
          <article
            className={`nearby-place${selected === p.id ? " selected" : ""}`}
            key={p.id}
          >
            <button
              className="nearby-focus"
              type="button"
              aria-pressed={selected === p.id}
              onClick={() => {
                setSelected(p.id);
                frame.current?.contentWindow?.postMessage(
                  { type: "mct-focus-poi", id: p.id },
                  window.location.origin,
                );
              }}
            >
              <small>{p.category}</small>
              <h3>{p.name}</h3>
              <strong>
                {formatDistance(
                  p.walkDistance ?? p.driveDistance ?? p.distance,
                )}
              </strong>
              <span className="quiet">
                {" "}
                ·{" "}
                {p.walkDistance !== undefined
                  ? "yaya yolu"
                  : p.driveDistance !== undefined
                    ? "araç yolu"
                    : "kuş uçuşu"}
              </span>
              <p className="quiet">
                {p.walkMinutes !== undefined
                  ? `Yürüyerek: ${p.walkMinutes} dk · ${formatDistance(p.walkDistance!)}`
                  : "Yaya rotası mevcut değil"}
                <br />
                {p.driveMinutes !== undefined
                  ? `Arabayla: ${p.driveMinutes} dk · ${formatDistance(p.driveDistance!)}`
                  : "Araç rotası mevcut değil"}
              </p>
              <span className="text-link">Haritada göster</span>
            </button>
            <a
              className="text-link"
              href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${p.lat},${p.lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Yol tarifi
            </a>
          </article>
        ))}
        {places !== null && !visible.length && (
          <p className="quiet">
            Bu kategoride harita verisine kayıtlı yer bulunamadı.
          </p>
        )}
      </div>
      <p className="quiet map-attribution">
        Veriler: © OpenStreetMap katkıda bulunanlar. Rota:{" "}
        {"OSRM / openrouteservice"}. Sonuçlar kuş uçuşu yakınlığa göre
        sıralanır; harita kayıtları eksik olabilir.
      </p>
    </section>
  );
}
