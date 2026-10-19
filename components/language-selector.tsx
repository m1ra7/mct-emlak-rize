"use client";
import { useState } from "react";
import { ChevronRight, Globe2 } from "lucide-react";
import { useTranslations } from "./locale-provider";
import { locales, localeNames, type Locale } from "@/lib/i18n/shared";
export function LanguageSelector() {
  const { locale, tr } = useTranslations();
  const [pending, setPending] = useState<Locale | null>(null);
  const [error, setError] = useState(false);
  async function change(
    event: React.MouseEvent<HTMLAnchorElement>,
    next: Locale,
  ) {
    event.preventDefault();
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
      <details className="language-disclosure">
        <summary className="language-summary">
          <Globe2 size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>{tr("Dil değiştir")}</span>
          <span className="language-current" lang={locale}>
            {localeNames[locale]}
          </span>
          <ChevronRight
            className="language-chevron"
            size={18}
            aria-hidden="true"
          />
        </summary>
        <nav
          className="language-options"
          aria-label={tr("Dil seçimi")}
          aria-busy={!!pending}
        >
          {locales.map((code) => (
            <a
              key={code}
              href={`/api/locale?locale=${code}`}
              lang={code}
              hrefLang={code}
              rel="nofollow"
              data-locale={code}
              aria-current={locale === code ? "true" : undefined}
              aria-disabled={!!pending}
              onClick={(event) => void change(event, code)}
            >
              {localeNames[code]}
              {pending === code && (
                <span className="sr-only">{tr("Kaydediliyor…")}</span>
              )}
            </a>
          ))}
        </nav>
      </details>
      {error && (
        <p role="alert">{tr("Dil değiştirilemedi. Tekrar deneyin.")}</p>
      )}
    </div>
  );
}
