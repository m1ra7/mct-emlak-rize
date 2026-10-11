"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="wrap">
      <div className="empty">
        <h1 style={{ fontSize: 32 }}>İşlem tamamlanamadı</h1>
        <p>Lütfen biraz sonra tekrar deneyin.</p>
        <button className="button" onClick={reset}>
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
