"use client";
import { useTranslations } from "@/components/locale-provider";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { themeKey, validTheme, type Theme } from "@/lib/theme";
function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function subscribe(callback: () => void) {
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
      : "dark";
    callback();
  };
  window.addEventListener("storage", update);
  window.addEventListener("mct-theme-change", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("mct-theme-change", update);
  };
}
function serverTheme(): Theme {
  return "dark";
}
export function ThemeToggle() {
  const { tr } = useTranslations();
  const theme = useSyncExternalStore(subscribe, current, serverTheme);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      title={dark ? tr("Açık temaya geç") : tr("Koyu temaya geç")}
      aria-label={dark ? tr("Açık temaya geç") : tr("Koyu temaya geç")}
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
      <span className="sr-only">
        {dark ? tr("Açık tema") : tr("Koyu tema")}
      </span>
    </button>
  );
}
