import { Empty } from "./empty-state";
export { Empty };
export function ServiceUnavailable() {
  return (
    <div className="wrap">
      <Empty
        title="Şu anda ilanlara erişilemiyor."
        text="Lütfen biraz sonra tekrar deneyin."
      />
    </div>
  );
}
export function money(price: string, currency = "TRY", locale = "tr-TR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price));
}
export const statusLabel: Record<string, string> = {
  published: "Yayında",
  pending: "Yayınlanmamış",
  draft: "Taslak",
  archived: "Yayından kaldırıldı",
};
