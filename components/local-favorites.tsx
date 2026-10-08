"use client";
import { useSyncExternalStore, useState, useEffect } from "react";
import { Heart } from "lucide-react";
import type { ListingResult } from "./listings";
import { ListingGrid } from "./listing-grid";
import { Empty } from "./ui";
const KEY = "mct-saved-listings-v1";
const EVENT = "mct-favorites-changed";
const empty: string[] = [];
function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
let cachedRaw: string | null = null;
let cachedIds: string[] = empty;
function get() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed = raw ? JSON.parse(raw) : [];
      cachedIds = Array.isArray(parsed)
        ? [
            ...new Set(
              parsed.filter(
                (x): x is string =>
                  typeof x === "string" && /^[a-f0-9-]{36}$/i.test(x),
              ),
            ),
          ].slice(0, 100)
        : empty;
    }
    return cachedIds;
  } catch {
    return empty;
  }
}
export function SavedButton({ id }: { id: string }) {
  const ids = useSyncExternalStore(subscribe, get, () => empty);
  const [error, setError] = useState("");
  const selected = ids.includes(id);
  return (
    <>
      <button
        className={`fav ${selected ? "selected" : ""}`}
        aria-label={selected ? "Kaydedilenlerden çıkar" : "İlanı kaydet"}
        title={selected ? "Kaydedilenlerden çıkar" : "İlanı kaydet"}
        aria-pressed={selected}
        onClick={() => {
          try {
            setError("");
            const current = get();
            const next = current.includes(id)
              ? current.filter((x) => x !== id)
              : [...current, id];
            if (next.length > 100) {
              setError("En fazla 100 ilan kaydedebilirsiniz.");
              return;
            }
            localStorage.setItem(KEY, JSON.stringify(next));
            window.dispatchEvent(new Event(EVENT));
          } catch {
            setError("Tarayıcınız kayıt saklamaya izin vermiyor.");
          }
        }}
      >
        <Heart size={20} fill={selected ? "currentColor" : "none"} />
      </button>
      {error && (
        <span className="alert" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
export function SavedListings() {
  const ids = useSyncExternalStore(subscribe, get, () => empty);
  const key = ids.join(",");
  const [response, setResponse] = useState<{
    key: string;
    items: ListingResult["items"];
    error: string;
  }>({ key: "", items: [], error: "" });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch("/api/saved?ids=" + encodeURIComponent(key), {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Kaydedilen ilanlara şu anda erişilemiyor.");
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setResponse({ key, items: data.items, error: "" });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setResponse({ key, items: [], error: e.message });
      });
    return () => controller.abort();
  }, [key]);
  const loading = !!key && response.key !== key;
  const items = key && response.key === key ? response.items : [];
  const error = response.key === key ? response.error : "";
  return (
    <>
      {loading ? (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : items.length ? (
        <ListingGrid items={items} />
      ) : (
        <Empty
          title={
            ids.length
              ? "Bu ilanlar artık yayında olmayabilir."
              : "Henüz bir ilan kaydetmediniz."
          }
          text="Beğendiğiniz ilanların kalp simgesine dokunun. Kaydettiğiniz ilanlar bu tarayıcıda saklanır."
          href="/ilanlar"
        />
      )}
    </>
  );
}
