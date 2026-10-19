import type { Locale } from "./i18n/shared";
export const listingTranslationPrefix = "i18n.";
export function listingText(
  source: { title: string; description?: string },
  locale: Locale,
  translations: Record<string, string> = {},
) {
  const title =
    locale === "tr" ? undefined : translations[`i18n.${locale}.title`]?.trim();
  const description =
    locale === "tr"
      ? undefined
      : translations[`i18n.${locale}.description`]?.trim();
  return {
    title: title || source.title,
    description: description || source.description || "",
    titleLanguage: title ? locale : "tr",
    descriptionLanguage: description ? locale : "tr",
    translatedDescription: !!description,
  };
}
