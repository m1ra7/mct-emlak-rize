import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSelector } from "@/components/language-selector";
import { getTranslations } from "@/lib/i18n/server";
import { currentUser } from "@/lib/security";
import { isAgencyOwner } from "@/lib/agency";
import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Logo } from "@/components/logo";
import "./globals.css";
import "./typography.css";
import "./design-system.css";
import Script from "next/script";
import { themeInit } from "@/lib/theme";
const baseMetadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "MCT Emlak Rize | Karadeniz’den Türkiye’ye",
    template: "%s | MCT Emlak Rize",
  },
  description:
    "MCT Emlak Rize: Rize ve Karadeniz ağırlıklı, Türkiye’nin farklı şehirlerine uzanan satılık ve kiralık konut, arsa ve iş yeri portföyü.",
};
export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getTranslations();
  return {
    ...baseMetadata,
    title: {
      default: tr("MCT Emlak Rize – Karadeniz’den Türkiye’ye"),
      template: "%s | MCT Emlak Rize",
    },
    description: tr(String(baseMetadata.description)),
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tr, locale } = await getTranslations();
  const account = await currentUser().catch(() => null);
  const canManage = !!account && isAgencyOwner(account);
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/manrope-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manrope-latin-ext.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Script id="mct-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <Navigation canManage={canManage} />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="footer-top">
              <div>
                <Link href="/" aria-label={tr("MCT Emlak ana sayfa")}>
                  <Logo light />
                </Link>
                <p>{tr("Doğru adres. Yeni bir hikâye.")}</p>
              </div>
              <div>
                <span>{tr("GAYRİMENKUL")}</span>
                <Link href="/ilanlar?type=satilik">{tr("Satılık")}</Link>
                <Link href="/ilanlar?type=kiralik">{tr("Kiralık")}</Link>
                <Link href="/ilanlar">{tr("Bütün ilanlar")}</Link>
              </div>
              <div>
                <span>{tr("KEŞFEDİN")}</span>
                <Link href="/bolgeler">{tr("Şehirleri keşfedin")}</Link>
                <Link href="/favoriler">{tr("Kaydedilen ilanlar")}</Link>
                <Link href="/iletisim">{tr("İletişim")}</Link>
              </div>
              <div className="footer-note">
                <span>{tr("RİZE’DEN TÜRKİYE’YE")}</span>
                <LanguageSelector />
                <p>
                  {tr("Karadeniz ağırlıklı portföy.")} <br />
                  {tr("Türkiye’nin farklı şehirlerinde yeni fırsatlar.")}{" "}
                </p>
              </div>
            </div>
            <div className="footer-bottom">
              <span>
                © {new Date().getFullYear()} {tr("MCT Emlak Rize")}
              </span>
              <span>{tr("Her başlangıcın bir adresi var.")}</span>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
