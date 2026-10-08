import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "İletişim",
  alternates: { canonical: "/iletisim" },
};
export default function Contact() {
  const phone = process.env.CONTACT_PHONE?.replace(/[^+0-9]/g, "");
  const email = process.env.CONTACT_EMAIL;
  return (
    <div className="wrap">
      <span className="eyebrow">MCT EMLAK RİZE</span>
      <h1 style={{ fontSize: 40 }}>İletişim</h1>
      <div className="panel stack">
        <p className="row">
          <MapPin size={20} />
          {process.env.CONTACT_ADDRESS || "Rize, Türkiye"}
        </p>
        {phone && (
          <>
            <a className="row" href={`tel:${phone}`}>
              <Phone size={20} />
              {process.env.CONTACT_PHONE}
            </a>
            <a
              className="button secondary"
              href={`https://wa.me/${phone.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp ile iletişim
            </a>
          </>
        )}
        {email && (
          <a className="row" href={`mailto:${email}`}>
            <Mail size={20} />
            {email}
          </a>
        )}
        <p className="quiet">
          Bir gayrimenkul hakkında bilgi almak için ilgili ilanın detay
          sayfasından ilan sahibine ulaşabilirsiniz.
        </p>
        <Link className="button" href="/ilanlar">
          İlanlara göz at
        </Link>
      </div>
    </div>
  );
}
