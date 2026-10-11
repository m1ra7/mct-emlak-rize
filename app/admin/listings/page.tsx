import { requireAdmin } from "@/lib/security";
import { searchListings, type SearchParams } from "@/lib/queries";
import { ManagedListings } from "@/components/dashboard";
export default async function AdminListings({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const p = await searchParams;
  return (
    <>
      <form className="row" style={{ marginBottom: 20 }}>
        <input
          name="q"
          placeholder="İlanlarda ara"
          defaultValue={typeof p.q === "string" ? p.q : ""}
          style={{ maxWidth: 300 }}
        />
        <select
          name="status"
          aria-label="Yayın durumu"
          defaultValue={typeof p.status === "string" ? p.status : ""}
          style={{ maxWidth: 220 }}
        >
          <option value="">Tüm durumlar</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
          <option value="pending">Eski yayınlanmamış</option>
          <option value="archived">Yayından kaldırılmış</option>
        </select>
        <button className="button secondary">Filtrele</button>
      </form>
      <ManagedListings
        result={await searchListings(p, { admin: true })}
        admin
        p={p}
      />
    </>
  );
}
