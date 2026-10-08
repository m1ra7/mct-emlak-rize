import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
test("Vektör harita: iğne seçme, sürükleme, mesaj güvenliği ve salt okunur konum", () => {
  for (const readOnly of [false, true]) {
    const handlers = {},
      events = {},
      markerEvents = {},
      sent = [];
    const nodes = Object.fromEntries(
      ["map", "hint", "pan", "error"].map((id) => [
        id,
        {
          style: {},
          pressed: "false",
          addEventListener: (key, fn) => (handlers[id + key] = fn),
          getAttribute() {
            return this.pressed;
          },
          setAttribute(_key, value) {
            this.pressed = value;
          },
        },
      ]),
    );
    let point = { lat: 0, lng: 0 },
      removed = false,
      zoom = 0,
      worker = "";
    const created = [];
    const makeNode = () => {
      const node = {
        style: {},
        events: {},
        setAttribute() {},
        addEventListener(key, fn) {
          this.events[key] = fn;
        },
        append() {},
      };
      created.push(node);
      return node;
    };
    class FakeMap {
      dragPan = { enable() {}, disable() {} };
      addControl() {}
      on(key, fn) {
        events[key] = fn;
      }
      jumpTo(value) {
        zoom = value.zoom;
      }
    }
    class FakeMarker {
      setLngLat([lng, lat]) {
        point = { lat, lng };
        return this;
      }
      addTo() {
        return this;
      }
      setPopup(popup) {
        this.popup = popup;
        return this;
      }
      getPopup() {
        return this.popup;
      }
      togglePopup() {}
      on(key, fn) {
        markerEvents[key] = fn;
      }
      getLngLat() {
        return point;
      }
      remove() {
        removed = true;
      }
    }
    const parent = { postMessage: (data) => sent.push(data) },
      origin = "http://localhost:3107";
    const source = readFileSync("public/vector-map.js", "utf8").replace(
      /^import[\s\S]*?from [^;]+;/,
      "",
    );
    runInNewContext(source, {
      Map: FakeMap,
      globalThis: { Map },
      Popup: class {
        setDOMContent() {
          return this;
        }
        remove() {}
      },
      Marker: FakeMarker,
      NavigationControl: class {},
      setWorkerUrl: (value) => (worker = value),
      URLSearchParams,
      location: {
        origin,
        search: readOnly ? "?readonly=1&lat=41.02&lon=40.51" : "",
      },
      matchMedia: () => ({ matches: true }),
      document: { getElementById: (id) => nodes[id], createElement: makeNode },
      parent,
      window: { addEventListener: (key, fn) => (handlers[key] = fn) },
    });
    assert.ok(worker.endsWith("maplibre-gl-worker.mjs"));
    assert.equal(nodes.map.style.touchAction, "pan-y");
    assert.equal(sent.filter((x) => x.type === "mct-location").length, 0);
    sent.length = 0;
    if (readOnly) {
      assert.equal(point.lat, 41.02);
      assert.equal(zoom, 16);
      assert.equal(events.click, undefined);
      const poi = {
        id: "node/1",
        name: "<script>test</script>",
        category: "Eğitim",
        lat: 41.03,
        lon: 40.52,
        distance: 120,
      };
      const sendPois = (sourceOrigin, points) =>
        handlers.message({
          origin: sourceOrigin,
          source: parent,
          data: { type: "mct-pois", points },
        });
      const count = created.length;
      sendPois("https://other.example", [poi]);
      assert.equal(created.length, count);
      sendPois(origin, [poi, { ...poi, id: "bad", lat: 91 }]);
      assert.equal(created.length, count + 4);
      assert.equal(created[count + 2].textContent, poi.name);
      created[count].events.click();
      assert.equal(sent[0].type, "mct-poi-selected");
      assert.equal(sent[0].id, poi.id);
      handlers.message({
        origin,
        source: parent,
        data: { type: "mct-focus-poi", id: poi.id },
      });
      assert.equal(zoom, 17);
      sendPois(origin, []);
      assert.equal(removed, true);
      continue;
    }
    events.click({ lngLat: { lat: 41.0255, lng: 40.5177 } });
    assert.equal(sent[0].lat, 41.0255);
    point = { lat: 41.03, lng: 40.52 };
    markerEvents.dragend();
    assert.equal(sent[1].lng, 40.52);
    const send = (sourceOrigin, latitude, longitude) =>
      handlers.message({
        origin: sourceOrigin,
        source: parent,
        data: { type: "mct-set-location", latitude, longitude },
      });
    send("https://other.example", "0", "0");
    assert.equal(point.lat, 41.03);
    send(origin, "41.04", "40.53");
    assert.equal(point.lat, 41.04);
    assert.equal(zoom, 17);
    assert.equal(sent.length, 2);
    send(origin, "", "");
    assert.equal(removed, true);
    handlers.panclick();
    assert.equal(nodes.map.style.touchAction, "none");
    handlers.panclick();
    assert.equal(nodes.map.style.touchAction, "pan-y");
  }
});
