"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowUpRight, Pause } from "lucide-react";
import { request } from "./widgets";
export function PublicationActions({
  id,
  status,
  compact = false,
}: {
  id: string;
  status: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const published = status === "published";
  return (
    <div className="publication-actions">
      <button
        type="button"
        disabled={busy}
        className={`button ${published ? "secondary" : ""} ${compact ? "small" : ""}`}
        aria-label={`${published ? "Yayından kaldır" : "Yayınla"}: ilan`}
        onClick={async () => {
          setBusy(true);
          setError("");
          setSuccess("");
          try {
            await request(`listings/${id}/status`, "PATCH", {
              status: published ? "archived" : "published",
            });
            setSuccess(
              published
                ? "İlan yayından kaldırıldı."
                : "İlan yayınlandı. Ziyaretçiler artık görebilir.",
            );
            if (!published) router.push("/admin?published=true");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {published ? <Pause size={15} /> : <ArrowUpRight size={15} />}
        {busy ? "Güncelleniyor…" : published ? "Yayından kaldır" : "Yayınla"}
      </button>
      {error && (
        <p className="publication-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="publication-success" role="status">
          <Check size={14} />
          {success}
        </p>
      )}
    </div>
  );
}
