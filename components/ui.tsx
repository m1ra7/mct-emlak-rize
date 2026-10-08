import { Building2 } from "lucide-react";
import Link from "next/link";
export function Empty({
  title = "Yeni adresler yakında burada.",
  text = "Portföyümüze eklenen gayrimenkuller burada yer alacak. Aradığınız yeri bize anlatabilirsiniz.",
  href,
  label,
}: {
  title?: string;
  text?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <Building2 size={36} />
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link className="button secondary" href={href}>
          {label || "İlanlara göz at"}
        </Link>
      )}
    </div>
  );
}
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
export function money(price: string, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
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
