"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, Menu, X, Home, Search, Phone } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
export function Navigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const management = path.startsWith("/admin") || path.startsWith("/yonetim");
  const links = [
    ["/satilik", "Satılık"],
    ["/kiralik", "Kiralık"],
    ["/bolgeler", "Bölgeler"],
  ];
  return (
    <>
      <header className="site-header">
        <nav className="nav" aria-label="Ana menü">
          <Link
            className="brand"
            href="/"
            aria-label="MCT Emlak Rize ana sayfa"
          >
            <Logo />
          </Link>
          <div className="desktop nav-links">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            <ThemeToggle />
            <Link
              href="/favoriler"
              className="icon-button desktop"
              aria-label="Kaydedilen ilanlar"
            >
              <Heart size={21} />
            </Link>
            <Link
              className="button nav-contact"
              href="/iletisim"
              aria-label="MCT Emlak ile iletişime geç"
            >
              <Phone size={16} />
              <span>İletişime geç</span>
            </Link>
            <button
              type="button"
              className="menu-button"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </nav>
        {open && (
          <nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Mobil ana menü"
          >
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href="/favoriler" onClick={() => setOpen(false)}>
              Kaydedilen ilanlar
            </Link>
          </nav>
        )}
      </header>
      {!management && (
        <nav className="mobile-nav" aria-label="Hızlı erişim">
          {[
            { href: "/", label: "Ana sayfa", Icon: Home },
            { href: "/ilanlar", label: "İlanlar", Icon: Search },
            { href: "/favoriler", label: "Kaydedilenler", Icon: Heart },
            { href: "/iletisim", label: "İletişim", Icon: Phone },
          ].map(({ href, label, Icon }) => (
            <Link
              key={String(href)}
              href={String(href)}
              aria-current={
                path === href ||
                (href === "/ilanlar" && ["/satilik", "/kiralik"].includes(path))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={20} />
              {String(label)}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
