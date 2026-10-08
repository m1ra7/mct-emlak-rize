"use client";
import { RefreshCw } from "lucide-react";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <RefreshCw size={32} />
      <h2>Yönetim verileri yüklenemedi.</h2>
      <p>
        Veritabanı bağlantısını ve kurulum ayarlarını kontrol edip tekrar
        deneyin.
      </p>
      <button
        type="button"
        className="button"
        onClick={reset}
        style={{ marginTop: 20 }}
      >
        Tekrar dene
      </button>
    </section>
  );
}
