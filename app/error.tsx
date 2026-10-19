"use client";
import { useTranslations } from "@/components/locale-provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { tr } = useTranslations();
  return (
    <div className="wrap">
      <div className="empty">
        <h1 style={{ fontSize: 32 }}>{tr("İşlem tamamlanamadı")}</h1>
        <p>{tr("Lütfen biraz sonra tekrar deneyin.")}</p>
        <button className="button" onClick={reset}>
          {tr("Tekrar dene")}{" "}
        </button>
      </div>
    </div>
  );
}
