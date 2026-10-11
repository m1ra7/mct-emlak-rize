"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { request } from "./widgets";
export function LocationDeleteButton({
  kind,
  id,
  name,
}: {
  kind: string;
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="location-delete-control">
      <button
        type="button"
        className="button secondary small location-delete-button"
        disabled={busy || deleted}
        aria-label={`${name} kaydını sil`}
        onClick={async () => {
          if (
            !window.confirm(
              `${name} kaydı silinsin mi? Bu işlem geri alınamaz.`,
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            await request(`locations/${kind}/${id}`, "DELETE");
            setDeleted(true);
            router.refresh();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Kayıt silinemedi.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Trash2 size={15} />
        {deleted ? "Silindi" : busy ? "Siliniyor…" : "Sil"}
      </button>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
    </div>
  );
}
