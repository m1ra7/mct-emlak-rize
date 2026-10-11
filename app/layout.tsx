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
export const metadata: Metadata = {
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
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await currentUser().catch(() => null);
  const canManage = !!account && isAgencyOwner(account);
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
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
        <Navigation canManage={canManage} />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="footer-top">
            <div>
              <Link href="/" aria-label="MCT Emlak ana sayfa">
                <Logo light />
              </Link>
              <p>Doğru adres. Yeni bir hikâye.</p>
            </div>
            <div>
              <span>GAYRİMENKUL</span>
              <Link href="/ilanlar?type=satilik">Satılık</Link>
              <Link href="/ilanlar?type=kiralik">Kiralık</Link>
              <Link href="/ilanlar">Bütün ilanlar</Link>
            </div>
            <div>
              <span>KEŞFEDİN</span>
              <Link href="/bolgeler">Şehirleri keşfedin</Link>
              <Link href="/favoriler">Kaydedilen ilanlar</Link>
              <Link href="/iletisim">İletişim</Link>
            </div>
            <div className="footer-note">
              <span>RİZE’DEN TÜRKİYE’YE</span>
              <p>
                Karadeniz ağırlıklı portföy.
                <br />
                Türkiye’nin farklı şehirlerinde yeni fırsatlar.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} MCT Emlak Rize</span>
            <span>Her başlangıcın bir adresi var.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
