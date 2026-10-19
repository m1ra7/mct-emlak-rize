"use client";
import { useTranslations } from "@/components/locale-provider";
export default function Loading() {
  const { tr } = useTranslations();
  return (
    <div className="wrap" aria-busy="true" aria-label={tr("Yükleniyor")}>
      <div className="skeleton" style={{ height: 150, marginBottom: 24 }} />
      <div className="grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
