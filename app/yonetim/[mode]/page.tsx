import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "İşletme yönetimi",
  robots: { index: false, follow: false },
};
export default async function Management({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!["giris", "sifremi-unuttum", "sifre-sifirla"].includes(mode)) notFound();
  return (
    <div className="management-shell">
      <section className="management-story">
        <Image
          src="/images/coastal-residence.webp"
          alt="Karadeniz kıyısından ilham alan mimari konsept"
          fill
          sizes="(max-width: 800px) 100vw, 50vw"
          priority
        />
        <div className="management-shade" />
        <div className="management-story-content">
          <Logo light />
          <div>
            <span className="eyebrow">MCT STUDIO</span>
            <h2>
              Portföyünüz.
              <br />
              Tamamen sizin
              <br />
              <span>kontrolünüzde.</span>
            </h2>
            <p>
              İlanları yönetin, yeni adresleri yayınlayın.
              <br />
              İşletmenizin dijital vitrini, tek bir yerde.
            </p>
          </div>
          <span className="management-caption">RİZE · KARADENİZ</span>
        </div>
      </section>
      <section className="management-form-area">
        <Link href="/" className="management-back">
          Siteye dön <ArrowUpRight size={16} />
        </Link>
        <div className="management-form">
          <span className="management-lock">
            <ShieldCheck size={24} />
          </span>
          <span className="eyebrow">İŞLETME YÖNETİMİ</span>
          <h1>
            {mode === "giris"
              ? "Yeniden merhaba."
              : mode === "sifremi-unuttum"
                ? "Erişiminizi yenileyin."
                : "Yeni şifre belirleyin."}
          </h1>
          <p className="quiet">
            {mode === "giris"
              ? "İlanlarınızı yönetmek için hesabınıza giriş yapın."
              : "Yönetim hesabınıza güvenle geri dönün."}
          </p>
          <Suspense fallback={<p>Yükleniyor…</p>}>
            <AuthForm mode={mode} />
          </Suspense>
          <p className="management-note">
            <ShieldCheck size={14} /> Yalnızca işletme sahibine özel güvenli
            alan.
          </p>
        </div>
      </section>
    </div>
  );
}
