import { requireAdmin } from "@/lib/security";
import { ProfileForm } from "@/components/widgets";
export default async function Settings() {
  const u = await requireAdmin();
  return (
    <>
      <h1 style={{ fontSize: 36 }}>İşletme profili</h1>
      <div className="panel">
        <p className="quiet">
          İlanlarda gösterilen danışman iletişim bilgileri.
        </p>
        <ProfileForm name={u.name} phone={u.phone} />
      </div>
    </>
  );
}
