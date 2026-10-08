import { LocationImportButton } from "@/components/location-import-button";
import { requireAdmin } from "@/lib/security";
import { locations } from "@/lib/queries";
import { LocationManager } from "@/components/location-manager";
import { LocationDeleteButton } from "@/components/location-delete-button";
export default async function Locations({
  searchParams,
}: {
  searchParams: Promise<{ district?: string }>;
}) {
  await requireAdmin();
  const selected = (await searchParams).district;
  const selectedDistrict =
    selected && /^[0-9a-f-]{36}$/i.test(selected) ? selected : undefined;
  const data = await locations(selectedDistrict);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Konumlar ve türler</h1>
          <p className="quiet">
            İl, ilçe, mahalle ve gayrimenkul türlerini yönetin.
          </p>
        </div>
      </div>
      <LocationImportButton />
      <LocationManager data={data} />
      <section className="panel location-records">
        <h2>Kayıtlı konumlar</h2>
        <p className="quiet">
          İlanlarda kullanılan kayıtlar silinemez. Bir ili silmeden önce
          ilçelerini, bir ilçeyi silmeden önce mahallelerini kaldırın.
        </p>
        {!data.cities.length && <p className="quiet">Henüz il eklenmemiş.</p>}
        {data.cities.map((c) => (
          <details
            key={c.id}
            className="location-city"
            open={data.districts.some(
              (d) => d.cityId === c.id && d.id === selectedDistrict,
            )}
          >
            <summary>{c.name}</summary>
            <div className="location-record">
              <strong>{c.name} — İl</strong>
              <LocationDeleteButton kind="city" id={c.id} name={c.name} />
            </div>
            {data.districts
              .filter((d) => d.cityId === c.id)
              .map((d) => (
                <div className="location-district" key={d.id}>
                  <div className="location-record">
                    <strong>{d.name} — İlçe</strong>
                    <LocationDeleteButton
                      kind="district"
                      id={d.id}
                      name={`${c.name} / ${d.name}`}
                    />
                  </div>
                  <a
                    className="button secondary"
                    href={`/admin/locations?district=${d.id}`}
                  >
                    Mahalleleri göster
                  </a>
                  {data.neighborhoods
                    .filter((n) => n.districtId === d.id)
                    .map((n) => (
                      <div
                        className="location-record location-neighborhood"
                        key={n.id}
                      >
                        <span>{n.name}</span>
                        <LocationDeleteButton
                          kind="neighborhood"
                          id={n.id}
                          name={`${d.name} / ${n.name}`}
                        />
                      </div>
                    ))}
                  {selectedDistrict === d.id &&
                    !data.neighborhoods.some((n) => n.districtId === d.id) && (
                      <p className="quiet">Mahalle eklenmemiş.</p>
                    )}
                </div>
              ))}
          </details>
        ))}
        <h2>Gayrimenkul türleri</h2>
        {data.types.map((t) => (
          <div className="location-record" key={t.id}>
            <span>{t.name}</span>
            <LocationDeleteButton kind="property" id={t.id} name={t.name} />
          </div>
        ))}
      </section>
    </>
  );
}
