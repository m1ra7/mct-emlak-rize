"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { locations } from "@/lib/queries";
import { request } from "./widgets";
export function LocationManager({
  data,
}: {
  data: Awaited<ReturnType<typeof locations>>;
}) {
  const [kind, setKind] = useState("city");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setOk(false);
        const f = new FormData(e.currentTarget);
        try {
          await request("locations", "POST", {
            kind,
            name: f.get("name"),
            parent: f.get("parent"),
            allowSale: f.get("allowSale") === "on",
            allowRent: f.get("allowRent") === "on",
          });
          setOk(true);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Eklenecek kayıt
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="city">İl</option>
          <option value="district">İlçe</option>
          <option value="neighborhood">Mahalle</option>
          <option value="property">Gayrimenkul türü</option>
        </select>
      </label>
      {kind === "district" && (
        <label>
          İl
          <select name="parent" required>
            {data.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "neighborhood" && (
        <label>
          İlçe
          <select name="parent" required>
            {data.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {data.cities.find((c) => c.id === d.cityId)?.name} / {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Ad
        <input name="name" required minLength={2} maxLength={100} />
      </label>
      {kind === "property" && (
        <>
          <label className="check">
            <input type="checkbox" name="allowSale" defaultChecked />
            Satılık ilanlarda kullan
          </label>
          <label className="check">
            <input type="checkbox" name="allowRent" defaultChecked />
            Kiralık ilanlarda kullan
          </label>
        </>
      )}
      <button disabled={busy} className="button">
        Ekle
      </button>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="alert success" role="status">
          Kayıt eklendi.
        </p>
      )}
    </form>
  );
}
