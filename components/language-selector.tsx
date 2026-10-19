"use client";
import { Fragment, useState } from "react";
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
      <nav
        className="language-options"
        aria-label={tr("Dil seçimi")}
        aria-busy={!!pending}
      >
        {locales.map((code, index) => (
          <Fragment key={code}>
            {index > 0 && (
              <span className="language-divider" aria-hidden="true">
                /
              </span>
            )}
            <a
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
          </Fragment>
        ))}
      </nav>
      {error && (
        <p role="alert">{tr("Dil değiştirilemedi. Tekrar deneyin.")}</p>
      )}
    </div>
  );
}
