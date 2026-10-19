import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isLocale, localeCookie, translator, intlLocales } from "./shared";
export const getTranslations = cache(async () => {
  const saved = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(saved) ? saved : "tr";
  return { locale, intlLocale: intlLocales[locale], tr: translator(locale) };
});
