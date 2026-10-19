"use client";
import { useState } from "react";
import { Globe2 } from "lucide-react";
import { useTranslations } from "./locale-provider";
import { locales, localeNames, type Locale } from "@/lib/i18n/shared";
export function LanguageSelector() {
  const { locale, tr } = useTranslations();
  const [pending, setPending] = useState<Locale | null>(null);
  const [error, setError] = useState(false);
  async function change(next: Locale) {
    if (next === locale || pending) return;
    setPending(next);
    setError(false);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) throw new Error("locale");
      window.location.reload();
    } catch {
      setError(true);
      setPending(null);
    }
  }
  return (
    <div className="footer-languages">
      <form
        className="language-setting"
        action="/api/locale"
        method="post"
        aria-busy={!!pending}
      >
        <label htmlFor="footer-language">
          <Globe2 size={16} strokeWidth={1.5} aria-hidden="true" />
        </label>
        <select
          id="footer-language"
          name="locale"
          value={pending ?? locale}
          disabled={!!pending}
          onChange={(event) => void change(event.target.value as Locale)}
          aria-label={tr("Dil seçimi")}
        >
          {locales.map((code) => (
            <option key={code} value={code} lang={code}>
              {localeNames[code]}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit">{tr("Dil değiştir")}</button>
        </noscript>
        {pending && (
          <span role="status" className="sr-only">
            {tr("Kaydediliyor…")}
          </span>
        )}
      </form>
      {error && (
        <p role="alert">{tr("Dil değiştirilemedi. Tekrar deneyin.")}</p>
      )}
    </div>
  );
}
