"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { request } from "./widgets";
export function LocationImportButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="location-import-control">
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          setError("");
          try {
            const result = await request("locations/import", "POST", {});
            setMessage(
              `${result.addedCities} il, ${result.addedDistricts} ilçe ve ${result.addedNeighborhoods} mahalle eklendi.`,
            );
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Konumlar eklenemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <MapPin size={18} />
        {busy
          ? "Konumlar ekleniyor…"
          : "Türkiye’nin tüm il, ilçe ve mahallelerini ekle"}
      </button>
      {message && (
        <p role="status" className="alert success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
    </div>
  );
}
