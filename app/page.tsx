import { getTranslations } from "@/lib/i18n/server";
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
} from "lucide-react";
import {
  locations,
  publishedListingCities,
  searchListings,
} from "@/lib/queries";
import { HomePortfolio } from "@/components/home-portfolio";
import { HomeSearch } from "@/components/home-search";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { tr } = await getTranslations();
  let data: Awaited<ReturnType<typeof locations>> = {
    cities: [],
    districts: [],
    neighborhoods: [],
    types: [],
  };
  let recent: Awaited<ReturnType<typeof searchListings>>["items"] = [];
  let featured: Awaited<ReturnType<typeof searchListings>>["items"] = [];
  let listingCities: Awaited<ReturnType<typeof publishedListingCities>> = [];
  let unavailable = !process.env.DATABASE_URL;
  if (process.env.DATABASE_URL) {
    try {
      const result = await Promise.all([
        locations(),
        searchListings({ featured: "true" }),
        searchListings(),
        publishedListingCities(),
      ]);
      data = result[0];
      featured = result[1].items.slice(0, 3);
      recent = result[2].items;
      listingCities = result[3];
      unavailable = false;
    } catch {
      unavailable = true;
    }
  }
  const latest = recent.slice(0, 3);
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-overline">
            <span /> {tr("RİZE’DEN TÜRKİYE’YE")}{" "}
          </span>
          <h1>
            {tr("Yaşamınıza")} <br />
            <span>{tr("yeni bir yer.")}</span>
          </h1>
          <p>
            {tr(
              "Karadeniz ağırlıklı portföyümüz ve Türkiye’nin farklı şehirlerindeki ilanlarımızla evinizi, iş yerinizi veya yatırımınızı birlikte bulalım.",
            )}{" "}
          </p>
          <div className="hero-cta-row">
            <Link href="/ilanlar" className="button">
              {tr("Portföyü keşfet")}{" "}
            </Link>
            <Link href="/iletisim" className="hero-secondary">
              {tr("Bizi tanıyın")}{" "}
              <span>
                <Phone size={17} />
              </span>
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/images/coastal-residence.webp"
            alt={tr(
              "Karadeniz kıyısından ilham alan çağdaş bir evin mimari konsepti",
            )}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
            className="residence-image"
          />
          <div className="visual-top">
            <span>
              <MapPin size={15} />{" "}
              {tr("Rize merkezli · Karadeniz ağırlıklı")}{" "}
            </span>
            <span className="visual-index">{tr("01 / YAŞAM")}</span>
          </div>
          <div className="visual-card">
            <span className="visual-card-icon">
              <Building2 size={23} />
            </span>
            <div>
              <small>{tr("İYİ BİR HAYATIN BAŞLANGICI")}</small>
              <strong>{tr("Doğru adresle başlar.")}</strong>
            </div>
          </div>
        </div>
      </section>
      <div className="wrap home-content">
        <HomeSearch data={data} />
        <div className="category-strip">
          <Link className="category-card" href="/satilik">
            <Building2 />
            <span>
              <strong>{tr("Yeni eviniz")}</strong>
              <small>{tr("Satılık gayrimenkuller")}</small>
            </span>
          </Link>
          <Link className="category-card" href="/kiralik">
            <KeyRound />
            <span>
              <strong>{tr("Yeni bir başlangıç")}</strong>
              <small>{tr("Kiralık yaşam alanları")}</small>
            </span>
          </Link>
          <Link className="category-card" href="/ilanlar">
            <LandPlot />
            <span>
              <strong>{tr("Geleceğe yatırım")}</strong>
              <small>{tr("Arsa ve iş yerlerini keşfedin")}</small>
            </span>
          </Link>
        </div>
        <section
          className="section home-listings"
          aria-labelledby="home-listings-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{tr("PORTFÖY / KEŞFET")}</span>
              <h2 id="home-listings-title">
                {tr("Hayalinizdeki yer,")}{" "}
                <span>{tr("biraz daha yakın.")}</span>
              </h2>
            </div>
            <Link href="/ilanlar" className="portfolio-all-link">
              {tr("Tüm ilanlar")}{" "}
            </Link>
          </div>
          {unavailable ? (
            <div className="empty">
              <Building2 size={30} />
              <h3>{tr("İlanlar şu anda yüklenemiyor.")}</h3>
              <p>{tr("Lütfen biraz sonra tekrar deneyin.")}</p>
            </div>
          ) : (
            <HomePortfolio featured={featured} latest={latest} />
          )}
        </section>
        <section className="editorial-section" id="bolgeler">
          <div className="editorial-copy">
            <span className="eyebrow">{tr("KARADENİZ’DEN BAŞLAYIN")}</span>
            <h2>
              {tr("Şehrin ritmi.")} <br />
              {tr("Doğanın huzuru.")} <br />
              <span>{tr("Türkiye’de yeni adresler.")}</span>
            </h2>
            <p>
              {tr(
                "Rize ve Karadeniz’den başlayıp Türkiye’nin farklı şehirlerine uzanan portföyümüzde, yayında ilan bulunan şehirleri keşfedin. Aradığınız şehri seçerek o bölgedeki ilanlara ulaşın.",
              )}{" "}
            </p>
            <Link href="/bolgeler" className="button secondary">
              {tr("Bütün bölgeleri keşfet")}{" "}
            </Link>
          </div>
          <div className="region-panel">
            <div className="region-heading">
              <MapPin size={24} />
              <span>{tr("KARADENİZ’DEN KEŞFEDİN")}</span>
            </div>
            <div className="districts">
              {listingCities.map((city, i) => (
                <Link key={city.id} href={`/ilanlar?city=${city.id}`}>
                  <span className="district-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="city-row-info">
                    <strong>{city.name}</strong>
                    <small>
                      {tr("{count} aktif ilan", { count: city.listingCount })}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
            {!listingCities.length ? (
              <p className="quiet">
                {tr("Şu anda yayında ilan bulunan şehir yok.")}
              </p>
            ) : (
              <div className="region-footer">
                {tr("Bu şehirlerdeki yayındaki ilanları görüntüleyin.")}{" "}
              </div>
            )}
          </div>
        </section>
        <section className="values-row">
          <div>
            <ShieldCheck />
            <h3>{tr("Kararınız netleşsin.")}</h3>
            <p>
              {tr(
                "İlanın konumunu, özelliklerini ve fiyatını aynı yerde inceleyin.",
              )}{" "}
            </p>
          </div>
          <div>
            <SlidersHorizontal />
            <h3>{tr("Tam size göre.")}</h3>
            <p>
              {tr(
                "Bütçenize ve yaşamınıza uyan seçeneklere filtrelerle ulaşın.",
              )}
            </p>
          </div>
          <div>
            <Phone />
            <h3>{tr("Bir konuşmayla başlar.")}</h3>
            <p>
              {tr("Telefon veya WhatsApp üzerinden doğrudan iletişime geçin.")}
            </p>
          </div>
        </section>
        <section className="contact-band owner-contact-band">
          <div>
            <span className="eyebrow">{tr("MCT EMLAK İLE ÇALIŞIN")}</span>
            <h2>{tr("Gayrimenkulünüzü bize emanet edin.")}</h2>
          </div>
          <div>
            <p>
              {tr(
                "Evinizi, arsanızı veya iş yerinizi satmak ya da kiralamak için bize ulaşın. Gayrimenkulünüzü MCT Emlak Rize portföyünde değerlendirelim.",
              )}{" "}
            </p>
            <Link href="/iletisim" className="button">
              {tr("Gayrimenkulüm için danışmanlık al")} <Phone size={17} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
