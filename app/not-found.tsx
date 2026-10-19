import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
export default async function NotFound() {
  const { tr } = await getTranslations();
  return (
    <div className="wrap">
      <div className="empty">
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: 36 }}>{tr("Aradığınız sayfa bulunamadı.")}</h1>
        <p>{tr("İlan kaldırılmış veya bağlantı değişmiş olabilir.")}</p>
        <Link className="button" href="/ilanlar">
          {tr("İlanlara dön")}{" "}
        </Link>
      </div>
    </div>
  );
}
