import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap">
      <div className="empty">
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: 36 }}>Aradığınız sayfa bulunamadı.</h1>
        <p>İlan kaldırılmış veya bağlantı değişmiş olabilir.</p>
        <Link className="button" href="/ilanlar">
          İlanlara dön
        </Link>
      </div>
    </div>
  );
}
