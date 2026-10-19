import en from "./en.json";
import de from "./de.json";
export const locales = ["tr", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = "mct-locale";
export const localeNames: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
};
export const intlLocales: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
const dictionaries: Record<"en" | "de", Record<string, string>> = { en, de };
export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;
export function translator(locale: Locale): Translator {
  return (key, params = {}) => {
    const normalized = key.replace(/\s+/g, " ").trim();
    const singular = Number(params.count) === 1;
    const variant =
      singular && locale !== "tr"
        ? dictionaries[locale][`${normalized}::one`]
        : undefined;
    const text =
      locale === "tr"
        ? normalized
        : (variant ?? dictionaries[locale][normalized] ?? normalized);
    return text.replace(/\{(\w+)\}/g, (token, name: string) =>
      params[name] === undefined ? token : String(params[name]),
    );
  };
}
