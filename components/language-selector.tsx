"use client";
import { useState } from "react";
import { Globe2 } from "lucide-react";
import { useTranslations } from "./locale-provider";
import { locales, localeNames, type Locale } from "@/lib/i18n/shared";
export function LanguageSelector() {
  const { locale, tr } = useTranslations();
  const [pending, setPending] = useState<Locale | null>(null);
  const [error, setError] = useState(false);
  async function change(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const next = submitter?.value as Locale | undefined;
    if (!next || next === locale || pending) return;
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
        action="/api/locale"
        method="post"
        onSubmit={change}
        aria-busy={!!pending}
      >
        <fieldset disabled={!!pending}>
          <legend>
            <Globe2 size={17} aria-hidden="true" /> {tr("Dil seçimi")}
          </legend>
          <div className="language-options">
            {locales.map((code) => (
              <button
                type="submit"
                name="locale"
                value={code}
                key={code}
                lang={code}
                aria-pressed={locale === code}
              >
                <span>{localeNames[code]}</span>
                {pending === code && (
                  <span className="sr-only">{tr("Kaydediliyor…")}</span>
                )}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
      {error && (
        <p role="alert">{tr("Dil değiştirilemedi. Tekrar deneyin.")}</p>
      )}
    </div>
  );
}
