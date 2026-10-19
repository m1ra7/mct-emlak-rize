"use client";
import { createContext, useContext, useMemo } from "react";
import { translator, intlLocales, type Locale } from "@/lib/i18n/shared";
const LocaleContext = createContext<Locale>("tr");
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
export function useTranslations() {
  const locale = useContext(LocaleContext);
  return useMemo(
    () => ({ locale, intlLocale: intlLocales[locale], tr: translator(locale) }),
    [locale],
  );
}
export function LocalizedText({ text }: { text: string }) {
  const { tr } = useTranslations();
  return <>{tr(text)}</>;
}
