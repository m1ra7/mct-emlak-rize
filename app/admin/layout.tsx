import { isAgencyOwner } from "@/lib/agency";
import { AdminNavigation } from "@/components/admin-navigation";
import { Building2, Check } from "lucide-react";
import { Logout } from "@/components/widgets";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/security";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await currentUser();
  if (!u) redirect("/yonetim/giris");
  if (!isAgencyOwner(u)) redirect("/");
  return (
    <div className="wrap admin-wrap">
      <div className="dash">
        <aside>
          <div className="admin-brand">
            <span>
              <Building2 size={22} />
            </span>
            <div>
              <strong>MCT Studio</strong>
              <small>İLAN YÖNETİMİ</small>
            </div>
          </div>
          <AdminNavigation />
          <div className="admin-owner">
            <span>{u.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
            <div>
              <strong>{u.name}</strong>
              <small>
                <Check size={12} /> İşletme sahibi
              </small>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Logout />
          </div>
        </aside>
        <section className="admin-main">{children}</section>
      </div>
    </div>
  );
}
