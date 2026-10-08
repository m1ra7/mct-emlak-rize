(() => {
  const hint = document.getElementById("hint");
  const container = document.getElementById("map");
  if (!window.L) {
    container.hidden = true;
    hint.hidden = true;
    document.getElementById("error").hidden = false;
    return;
  }
  const mobile = L.Browser.mobile;
  const map = L.map("map", {
    scrollWheelZoom: false,
    dragging: !mobile,
    touchZoom: !mobile,
  }).setView([41.0255, 40.5177], 13);
  if (mobile) container.style.touchAction = "pan-y";
  const pan = document.getElementById("pan");
  pan.addEventListener("click", () => {
    const active = pan.getAttribute("aria-pressed") !== "true";
    pan.setAttribute("aria-pressed", String(active));
    pan.textContent = active ? "Sayfayı kaydır" : "Haritayı taşı";
    if (active) {
      map.dragging.enable();
      map.touchZoom.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
    }
    container.style.touchAction = active ? "none" : "pan-y";
  });
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    },
  ).addTo(map);
  tiles.on("tileerror", () => {
    hint.textContent =
      "Harita zemini yüklenemedi. İnternet bağlantınızı kontrol edin; seçilen konum korunur.";
  });
  const icon = L.divIcon({
    className: "pin",
    html: '<svg viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 44C14 38 2 25 2 18a16 16 0 1 1 32 0c0 7-12 20-16 26Z" fill="#e5484d" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="6" fill="#fff"/></svg>',
    iconSize: [36, 46],
    iconAnchor: [18, 44],
  });
  let marker;
  function valid(lat, lng) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    );
  }
  function place(lat, lng, notify) {
    if (!valid(lat, lng)) return;
    if (!marker) {
      marker = L.marker([lat, lng], {
        draggable: true,
        icon,
        title: "İlan konumu",
        autoPan: true,
      }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        place(point.lat, point.lng, true);
      });
    } else marker.setLatLng([lat, lng]);
    hint.textContent = "İğne seçildi. İlanı kaydederek konumu saklayın.";
    if (notify)
      parent.postMessage({ type: "mct-location", lat, lng }, location.origin);
  }
  map.on("click", (event) => place(event.latlng.lat, event.latlng.lng, true));
  window.addEventListener("message", (event) => {
    if (
      event.origin !== location.origin ||
      event.source !== parent ||
      event.data?.type !== "mct-set-location"
    )
      return;
    const { latitude, longitude } = event.data;
    const lat = Number(latitude),
      lng = Number(longitude);
    if (
      typeof latitude !== "string" ||
      typeof longitude !== "string" ||
      !latitude.trim() ||
      !longitude.trim() ||
      !valid(lat, lng)
    ) {
      if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
      hint.textContent = "Dairenin bulunduğu noktaya dokunun.";
      return;
    }
    const old = marker?.getLatLng();
    place(lat, lng, false);
    if (
      !old ||
      Math.abs(old.lat - lat) > 0.000001 ||
      Math.abs(old.lng - lng) > 0.000001
    )
      map.setView([lat, lng], 17);
  });
})();
