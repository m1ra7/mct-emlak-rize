"use client";
import { useTranslations } from "@/components/locale-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  nearbyVisible,
  nearbyResultLimit,
  type NearbyPlace,
} from "@/lib/nearby";
import { NearbyCategories } from "./nearby-categories";
import { listingMap } from "@/lib/listing-map";
export function NearbyPlaces({
  id,
  latitude,
  longitude,
  address,
  land = false,
  approximateLocation = false,
  approximateCenter,
}: {
  id: string;
  latitude: string | null;
  longitude: string | null;
  address: string;
  land?: boolean;
  approximateLocation?: boolean;
  approximateCenter?: { latitude: string; longitude: string } | null;
}) {
  const { tr, locale, intlLocale } = useTranslations();
  const formatDistance = (meters: number) =>
    meters < 1000
      ? `${meters} m`
      : `${(meters / 1000).toLocaleString(intlLocale, { maximumFractionDigits: 1 })} km`;
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [partial, setPartial] = useState(false);
  const [limitedCoverage, setLimitedCoverage] = useState(false);
  const [count, setCount] = useState(12);
  const [routeData, setRouteData] = useState<Record<string, NearbyPlace>>({});
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [limitedCategories, setLimitedCategories] = useState<string[]>([]);
  const routeCache = useRef(new Set<string>());
  const [category, setCategory] = useState("Tümü");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const section = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);
  const mapPoints = useMemo(
    () => nearbyVisible(places || [], category, count),
    [places, category, count],
  );
  const visible = useMemo(
    () => mapPoints.map((p) => routeData[p.id] || p),
    [mapPoints, routeData],
  );
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        ["Tümü", ...new Set((places || []).map((p) => p.category))].map((c) => [
          c,
          c === "Tümü"
            ? (places || []).length
            : (places || []).filter((p) => p.category === c).length,
        ]),
      ),
    [places],
  );
  const sync = useCallback(
    () =>
      frame.current?.contentWindow?.postMessage(
        { type: "mct-pois", points: mapPoints },
        window.location.origin,
      ),
    [mapPoints],
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
      if (!Array.isArray(data.places))
        throw new Error("Yakın çevre yanıtı geçersiz. Tekrar deneyin.");
      if (!abort.signal.aborted) {
        routeCache.current.clear();
        setRouteData({});
        setRouteError("");
        setPlaces(data.places);
        setPartial(data.partial === true);
        setLimitedCoverage(data.limitedCoverage === true);
        setLimitedCategories(data.limitedCategories || []);
      }
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
    if (!places?.length) return;
    const cacheKey = `${category}:${count}`;
    if (routeCache.current.has(cacheKey)) return;
    const abort = new AbortController();
    async function loadRoutes() {
      setRouteBusy(true);
      setRouteError("");
      try {
        const response = await fetch(
          `/api/nearby?id=${encodeURIComponent(id)}&routes=${encodeURIComponent(category)}&count=${count}`,
          { signal: abort.signal },
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.places))
          throw new Error(
            "Süre bilgileri şu anda yüklenemiyor. Yakındaki yerler ve mesafeler gösterilmeye devam ediyor.",
          );
        if (!abort.signal.aborted) {
          routeCache.current.add(cacheKey);
          setRouteData((old) => ({
            ...old,
            ...Object.fromEntries(
              data.places.map((p: NearbyPlace) => [p.id, p]),
            ),
          }));
        }
      } catch (error) {
        if (!abort.signal.aborted)
          setRouteError(
            error instanceof Error
              ? error.message
              : "Süre bilgileri yüklenemedi.",
          );
      } finally {
        if (!abort.signal.aborted) setRouteBusy(false);
      }
    }
    void loadRoutes();
    return () => abort.abort();
  }, [places, category, count, id]);
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
        <h2>{tr("Çevrede Neler Var?")}</h2>
        <p className="quiet">
          {tr("Yakındaki yerler için ilan konumu henüz kaydedilmemiş.")}{" "}
        </p>
      </section>
    );
  const map = listingMap({
    address,
    city: "",
    district: "",
    latitude: latitude || approximateCenter?.latitude || null,
    longitude: longitude || approximateCenter?.longitude || null,
    approximate:
      approximateLocation ||
      (latitude === null && longitude === null && Boolean(approximateCenter)),
  });
  return (
    <section className="panel nearby-section" ref={section} aria-busy={busy}>
      <h2>{tr("Konum")}</h2>
      <p className="quiet">{address}</p>
      <div className="nearby-map-wrap">
        <iframe
          ref={frame}
          className="listing-map"
          title={tr("İlan ve yakın çevredeki yerler")}
          src={`${map.embed}&kind=${land ? "land" : "home"}&lang=${locale}`}
          onLoad={sync}
          loading="lazy"
        />
        {(approximateLocation ||
          (approximateCenter && latitude === null && longitude === null)) && (
          <p className="quiet map-note">
            {tr(
              "Açık adres için kesin bina noktası bulunamadı; yaklaşık bölge daire içinde gösteriliyor.",
            )}{" "}
          </p>
        )}
        <a
          className="text-link"
          href={map.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("İlan konumunu büyük haritada aç")}{" "}
        </a>
      </div>
      <h2>{tr("Çevrede Neler Var?")}</h2>
      <p className="quiet">
        {tr(
          "5 km çevresindeki haritaya kayıtlı yerler. Rota mesafeleri ve süreleri servis verileridir; araç süresi canlı trafiği içermez. Rota bulunamazsa yalnızca kuş uçuşu mesafe gösterilir.",
        )}{" "}
      </p>
      <NearbyCategories
        category={category}
        counts={categoryCounts}
        limitedCategories={limitedCategories}
        onSelect={(value) => {
          setCategory(value);
          setCount(12);
          setRouteBusy(false);
          setRouteError("");
          setSelected("");
        }}
      />
      {places !== null && (
        <p className="quiet" role="status">
          {category === "Tümü"
            ? tr("{count} yer · en yakın {shown} sonuç gösteriliyor.", {
                count: categoryCounts["Tümü"] || 0,
                shown: visible.length,
              })
            : tr("{count} yer · {shown} sonuç gösteriliyor.", {
                count: `${categoryCounts[category] || 0}${limitedCategories.includes(category) ? "+" : ""}`,
                shown: visible.length,
              })}
        </p>
      )}
      {category === "Tümü" &&
        count >= nearbyResultLimit &&
        (categoryCounts[category] || 0) > visible.length && (
          <p className="quiet">
            {tr("Diğer sonuçları görmek için bir kategori seçin.")}{" "}
          </p>
        )}
      {limitedCoverage && (
        <p className="quiet" role="status">
          {tr(
            "Yakındaki yerler alternatif harita kaynağından gösteriliyor. Bu kaynak bölgedeki tüm yerleri içermeyebilir.",
          )}{" "}
        </p>
      )}
      {partial && (
        <div role="status">
          <p className="quiet">
            {tr(
              "Servis yanıtı eksik geldi. Bulunan yerler gösteriliyor; diğer yerler için yeniden deneyebilirsiniz.",
            )}{" "}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => void load()}
            disabled={busy}
          >
            {tr("Yeniden yükle")}{" "}
          </button>
        </div>
      )}
      {routeBusy && (
        <p className="quiet" role="status">
          {tr("Yol mesafeleri ve süreler yükleniyor…")}{" "}
        </p>
      )}
      {routeError && (
        <p className="quiet" role="status">
          {tr(routeError)}
        </p>
      )}
      <div className="nearby-list">
        {busy && (
          <p role="status" className="quiet">
            {tr("Yakın çevredeki yerler yükleniyor…")}{" "}
          </p>
        )}
        {error && (
          <div role="alert">
            <p className="alert">{tr(error)}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => void load()}
              disabled={busy}
            >
              {tr("Tekrar dene")}{" "}
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
              <small>{tr(p.category)}</small>
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
                  ? tr("yaya yolu")
                  : p.driveDistance !== undefined
                    ? tr("araç yolu")
                    : tr("kuş uçuşu")}
              </span>
              <p className="quiet">
                {p.walkMinutes !== undefined
                  ? tr("Yürüyerek: {minutes} dk · {distance}", {
                      minutes: p.walkMinutes,
                      distance: formatDistance(p.walkDistance!),
                    })
                  : tr("Yaya rotası mevcut değil")}
                <br />
                {p.driveMinutes !== undefined
                  ? tr("Arabayla: {minutes} dk · {distance}", {
                      minutes: p.driveMinutes,
                      distance: formatDistance(p.driveDistance!),
                    })
                  : tr("Araç rotası mevcut değil")}
              </p>
              <span className="text-link">{tr("Haritada göster")}</span>
            </button>
            <a
              className="text-link"
              href={`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${p.lat},${p.lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("Yol tarifi")}{" "}
            </a>
          </article>
        ))}
        {(categoryCounts[category] || 0) > visible.length &&
          count < nearbyResultLimit && (
            <button
              type="button"
              className="button secondary nearby-more"
              onClick={() =>
                setCount((n) => Math.min(nearbyResultLimit, n + 12))
              }
            >
              {tr("Daha fazla yer göster")}{" "}
            </button>
          )}
        {places !== null && !busy && !error && !visible.length && (
          <p className="quiet">
            {tr("Bu kategoride harita verisine kayıtlı yer bulunamadı.")}{" "}
          </p>
        )}
      </div>
      <p className="quiet map-attribution">
        {tr("Veriler: © OpenStreetMap katkıda bulunanlar. Rota:")}{" "}
        {tr("OSRM / openrouteservice")}
        {tr(
          ". Sonuçlar kuş uçuşu yakınlığa göre sıralanır; harita kayıtları eksik olabilir.",
        )}{" "}
      </p>
    </section>
  );
}
