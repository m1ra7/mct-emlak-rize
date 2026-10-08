import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Building2,
  KeyRound,
  LandPlot,
  ShieldCheck,
  SlidersHorizontal,
  Phone,
  MoveUpRight,
} from "lucide-react";
import { locations, searchListings } from "@/lib/queries";
import { Cards } from "@/components/listings";
import { HomeSearch } from "@/components/home-search";
export const dynamic = "force-dynamic";
export default async function Home() {
  let data: Awaited<ReturnType<typeof locations>> = {
    cities: [],
    districts: [],
    neighborhoods: [],
    types: [],
  };
  let featured: Awaited<ReturnType<typeof searchListings>>["items"] = [];
  let recent: typeof featured = [];
  let unavailable = !process.env.DATABASE_URL;
  if (process.env.DATABASE_URL) {
    try {
      const result = await Promise.all([
        locations(),
        searchListings({ featured: "true" }),
        searchListings(),
      ]);
      data = result[0];
      featured = result[1].items;
      recent = result[2].items;
      unavailable = false;
    } catch {
      unavailable = true;
    }
  }
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-overline">
            <span /> RİZE’DE SİZE AİT BİR YER
          </span>
          <h1>
            Yaşamınıza
            <br />
            <span>yeni bir yer.</span>
          </h1>
          <p>
            Şehrin içinde, denizin kıyısında, doğanın kalbinde.
            <br className="desktop" /> Hayatınıza en çok yakışan adresi birlikte
            bulalım.
          </p>
          <div className="hero-cta-row">
            <Link href="/ilanlar" className="button">
              Portföyü keşfet <MoveUpRight size={18} />
            </Link>
            <Link href="/iletisim" className="hero-secondary">
              Bizi tanıyın{" "}
              <span>
                <Phone size={17} />
              </span>
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/images/coastal-residence.webp"
            alt="Karadeniz kıyısından ilham alan çağdaş bir evin mimari konsepti"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
            className="residence-image"
          />
          <div className="visual-top">
            <span>
              <MapPin size={15} /> Rize, Karadeniz
            </span>
            <span className="visual-index">01 / YAŞAM</span>
          </div>
          <div className="visual-card">
            <span className="visual-card-icon">
              <Building2 size={23} />
            </span>
            <div>
              <small>İYİ BİR HAYATIN BAŞLANGICI</small>
              <strong>Doğru adresle başlar.</strong>
            </div>
            <MoveUpRight size={21} />
          </div>
        </div>
      </section>
      <div className="wrap home-content">
        <HomeSearch data={data} />
        <div className="category-strip">
          <Link className="category-card" href="/satilik">
            <Building2 />
            <span>
              <strong>Yeni eviniz</strong>
              <small>Satılık gayrimenkuller</small>
            </span>
            <MoveUpRight size={19} />
          </Link>
          <Link className="category-card" href="/kiralik">
            <KeyRound />
            <span>
              <strong>Yeni bir başlangıç</strong>
              <small>Kiralık yaşam alanları</small>
            </span>
            <MoveUpRight size={19} />
          </Link>
          <Link className="category-card" href="/ilanlar">
            <LandPlot />
            <span>
              <strong>Geleceğe yatırım</strong>
              <small>Arsa ve iş yerlerini keşfedin</small>
            </span>
            <MoveUpRight size={19} />
          </Link>
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KEŞFEDİLMEYE DEĞER</span>
              <h2>
                Özenle seçilmiş <span>adresler.</span>
              </h2>
            </div>
            <Link
              href={featured.length ? "/ilanlar?featured=true" : "/ilanlar"}
              className="text-link"
            >
              {featured.length ? "Öne çıkan ilanlar" : "Tüm ilanları göster"}{" "}
              <MoveUpRight size={18} />
            </Link>
          </div>
          {unavailable ? (
            <div className="empty">
              <Building2 size={30} />
              <h3>İlanlar şu anda yüklenemiyor.</h3>
              <p>Lütfen biraz sonra tekrar deneyin.</p>
            </div>
          ) : (
            <Cards
              items={
                featured.length ? featured.slice(0, 3) : recent.slice(0, 3)
              }
            />
          )}
        </section>
        <section className="editorial-section" id="bolgeler">
          <div className="editorial-copy">
            <span className="eyebrow">YERİNİZİ BULUN</span>
            <h2>
              Şehrin ritmi.
              <br />
              Doğanın huzuru.
              <br />
              <span>Rize’nin her hâli.</span>
            </h2>
            <p>
              Merkezde hayatın içinde, kıyıda denizle yan yana veya yeşilin
              kalbinde. Aradığınız yaşamın bir adresi var.
            </p>
            <Link href="/bolgeler" className="button secondary">
              Bütün bölgeleri keşfet
            </Link>
          </div>
          <div className="region-panel">
            <div className="region-heading">
              <MapPin size={24} />
              <span>RİZE’DE YAŞAM</span>
            </div>
            <div className="districts">
              {data.districts
                .filter(
                  (d) =>
                    data.cities.find((c) => c.id === d.cityId)?.slug === "rize",
                )
                .map((d, i) => (
                  <Link key={d.id} href={`/ilanlar?district=${d.id}`}>
                    <span className="district-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <strong>{d.name}</strong>
                    <MoveUpRight size={17} />
                  </Link>
                ))}
            </div>
            {!data.districts.length && (
              <p className="quiet">
                Konumlar ilanlarla birlikte burada görünecek.
              </p>
            )}
            <div className="region-footer">
              Denizle doğa arasında, kendinize ait bir yer.
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YENİ ADRESLER</span>
              <h2>
                Yeni eklenen <span>fırsatlar.</span>
              </h2>
            </div>
            <Link href="/ilanlar" className="text-link">
              Tüm ilanları gör <MoveUpRight size={18} />
            </Link>
          </div>
          {!unavailable && <Cards items={recent.slice(0, 6)} />}
        </section>
        <section className="values-row">
          <div>
            <ShieldCheck />
            <h3>Kararınız netleşsin.</h3>
            <p>
              İlanın konumunu, özelliklerini ve fiyatını aynı yerde inceleyin.
            </p>
          </div>
          <div>
            <SlidersHorizontal />
            <h3>Tam size göre.</h3>
            <p>Bütçenize ve yaşamınıza uyan seçeneklere filtrelerle ulaşın.</p>
          </div>
          <div>
            <Phone />
            <h3>Bir konuşmayla başlar.</h3>
            <p>Telefon veya WhatsApp üzerinden doğrudan iletişime geçin.</p>
          </div>
        </section>
        <section className="contact-band">
          <div>
            <span className="eyebrow">BİR SONRAKİ ADIM</span>
            <h2>
              Hayalinizdeki adresi
              <br />
              birlikte bulalım.
            </h2>
          </div>
          <div>
            <p>
              Aradığınız yeri anlatın.
              <br />
              Yeni başlangıcınıza eşlik edelim.
            </p>
            <Link href="/iletisim" className="button">
              Bizimle iletişime geçin <Phone size={17} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
