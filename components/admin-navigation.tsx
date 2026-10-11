"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Settings2,
  ArrowUpRight,
} from "lucide-react";
export function AdminNavigation() {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Genel bakış", Icon: LayoutDashboard },
    { href: "/admin/listings", label: "İlanlarım", Icon: Building2 },
    { href: "/admin/locations", label: "Konumlar ve türler", Icon: MapPin },
    { href: "/admin/settings", label: "İşletme profili", Icon: Settings2 },
    { href: "/", label: "Siteyi görüntüle", Icon: ArrowUpRight },
  ];
  return (
    <nav className="sidebar" aria-label="Yönetim menüsü">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (
              href === "/admin"
                ? pathname === href
                : href !== "/" && pathname.startsWith(href)
            )
              ? "page"
              : undefined
          }
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
