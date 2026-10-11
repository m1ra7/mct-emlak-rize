export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Yükleniyor">
      <div className="skeleton" style={{ height: 150, marginBottom: 24 }} />
      <div className="grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
