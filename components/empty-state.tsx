"use client";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "./locale-provider";
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
  const { tr } = useTranslations();
  return (
    <div className="empty">
      <Building2 size={36} />
      <h3>{tr(title)}</h3>
      <p>{tr(text)}</p>
      {href && (
        <Link className="button secondary" href={href}>
          {tr(label || "İlanlara göz at")}
        </Link>
      )}
    </div>
  );
}
