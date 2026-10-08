import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  setWorkerUrl,
} from "/vendor/maplibre-6.13.0/maplibre-gl.mjs";
setWorkerUrl("/vendor/maplibre-6.13.0/maplibre-gl-worker.mjs");
const hint = document.getElementById("hint"),
  container = document.getElementById("map"),
  pan = document.getElementById("pan");
const params = new URLSearchParams(location.search),
  readOnly = params.get("readonly") === "1";
const valid = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;
let marker;
try {
  const mobile = matchMedia("(pointer:coarse)").matches;
  const map = new Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [40.5177, 41.0255],
    zoom: 13,
    cooperativeGestures: true,
    scrollZoom: false,
    dragPan: !mobile,
  });
  map.addControl(new NavigationControl({ showCompass: false }), "bottom-left");
  if (mobile) container.style.touchAction = "pan-y";
  pan.addEventListener("click", () => {
    const active = pan.getAttribute("aria-pressed") !== "true";
    pan.setAttribute("aria-pressed", String(active));
    pan.textContent = active ? "Sayfayı kaydır" : "Haritayı taşı";
    if (active) map.dragPan.enable();
    else map.dragPan.disable();
    container.style.touchAction = active ? "none" : "pan-y";
  });
  const place = (lat, lng, notify) => {
    if (!valid(lat, lng)) return;
    if (!marker) {
      const home = document.createElement("div");
      home.className = "listing-marker";
      home.textContent = params.get("kind") === "land" ? "▧" : "⌂";
      home.setAttribute("aria-label", "İlan konumu");
      marker = new Marker({ element: home, draggable: !readOnly })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLngLat();
        place(p.lat, p.lng, true);
      });
    } else marker.setLngLat([lng, lat]);
    hint.textContent = readOnly
      ? "İlanın kaydedilen konumu"
      : "İğne seçildi. İlanı kaydederek konumu saklayın.";
    if (notify)
      parent.postMessage({ type: "mct-location", lat, lng }, location.origin);
  };
  if (readOnly) {
    const lat = Number(params.get("lat")),
      lng = Number(params.get("lon"));
    if (params.has("lat") && params.has("lon") && valid(lat, lng)) {
      place(lat, lng, false);
      map.jumpTo({ center: [lng, lat], zoom: 16 });
    }
  } else map.on("click", (e) => place(e.lngLat.lat, e.lngLat.lng, true));
  const pois = new globalThis.Map();
  const icons = {
    Ulaşım: "🚌",
    Eğitim: "🎓",
    Sağlık: "✚",
    Market: "🛒",
    "Kafe & Restoran": "☕",
    "Kültür & Sanat": "🎭",
    Spor: "⚽",
    İbadet: "☾",
  };
  const focusPoi = (id) => {
    const entry = pois.get(id);
    if (!entry) return;
    map.jumpTo({ center: [entry.point.lon, entry.point.lat], zoom: 17 });
    for (const value of pois.values()) value.marker.getPopup()?.remove();
    entry.marker.togglePopup();
  };
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.source !== parent) return;
    if (readOnly && e.data?.type === "mct-focus-poi") {
      focusPoi(e.data.id);
      return;
    }
    if (readOnly && e.data?.type === "mct-pois") {
      for (const entry of pois.values()) {
        entry.marker.getPopup()?.remove();
        entry.marker.remove();
      }
      pois.clear();
      if (!Array.isArray(e.data.points)) return;
      for (const p of e.data.points.slice(0, 80)) {
        if (
          !p ||
          typeof p.id !== "string" ||
          typeof p.name !== "string" ||
          !valid(p.lat, p.lon) ||
          !icons[p.category] ||
          !Number.isFinite(p.distance) ||
          p.distance < 0
        )
          continue;
        const icon = document.createElement("button");
        icon.type = "button";
        icon.className = "poi-marker";
        icon.textContent = icons[p.category];
        icon.setAttribute("aria-label", `${p.name} · ${p.category}`);
        const card = document.createElement("div");
        const name = document.createElement("strong"),
          detail = document.createElement("p");
        name.textContent = p.name;
        detail.textContent = `${p.category} · ${p.distance < 1000 ? `${p.distance} m` : `${(p.distance / 1000).toFixed(1)} km`} kuş uçuşu`;
        card.append(name, detail);
        const pointMarker = new Marker({ element: icon })
          .setLngLat([p.lon, p.lat])
          .setPopup(new Popup({ offset: 24 }).setDOMContent(card))
          .addTo(map);
        pois.set(p.id, { marker: pointMarker, point: p });
        icon.addEventListener("click", () => {
          map.jumpTo({ center: [p.lon, p.lat], zoom: 17 });
          parent.postMessage(
            { type: "mct-poi-selected", id: p.id },
            location.origin,
          );
        });
      }
      return;
    }
    if (
      readOnly ||
      e.origin !== location.origin ||
      e.source !== parent ||
      e.data?.type !== "mct-set-location"
    )
      return;
    const { latitude, longitude } = e.data,
      lat = Number(latitude),
      lng = Number(longitude);
    if (
      typeof latitude !== "string" ||
      typeof longitude !== "string" ||
      !latitude.trim() ||
      !longitude.trim() ||
      !valid(lat, lng)
    ) {
      marker?.remove();
      marker = undefined;
      hint.textContent = "Dairenin bulunduğu noktaya dokunun.";
      return;
    }
    const old = marker?.getLngLat();
    place(lat, lng, false);
    if (
      !old ||
      Math.abs(old.lat - lat) > 0.000001 ||
      Math.abs(old.lng - lng) > 0.000001
    )
      map.jumpTo({ center: [lng, lat], zoom: 17 });
  });
  parent.postMessage({ type: "mct-map-ready" }, location.origin);
  map.on("error", () => {
    hint.textContent =
      "Harita katmanı yüklenemedi. Bağlantınızı kontrol edin; kayıtlı koordinatlar korunur.";
  });
} catch {
  container.hidden = true;
  hint.hidden = true;
  pan.hidden = true;
  document.getElementById("error").hidden = false;
}
