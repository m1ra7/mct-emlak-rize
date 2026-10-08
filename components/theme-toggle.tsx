"use client";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { themeKey, validTheme, type Theme } from "@/lib/theme";
function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(themeKey);
    } catch {
      callback();
      return;
    }
    document.documentElement.dataset.theme = validTheme(stored)
      ? stored
      : media.matches
        ? "dark"
        : "light";
    callback();
  };
  window.addEventListener("storage", update);
  window.addEventListener("mct-theme-change", update);
  media.addEventListener("change", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("mct-theme-change", update);
    media.removeEventListener("change", update);
  };
}
function serverTheme(): Theme {
  return "light";
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, serverTheme);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      title={dark ? "Açık temaya geç" : "Koyu temaya geç"}
      aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"}
      aria-pressed={dark}
      onClick={() => {
        const next = dark ? "light" : "dark";
        try {
          localStorage.setItem(themeKey, next);
        } catch {}
        document.documentElement.dataset.theme = next;
        window.dispatchEvent(new Event("mct-theme-change"));
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">{dark ? "Açık tema" : "Koyu tema"}</span>
    </button>
  );
}
