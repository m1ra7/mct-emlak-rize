import { getTranslations } from "@/lib/i18n/server";
import { SavedListings } from "@/components/local-favorites";
const baseMetadata = {
  title: "Kaydedilen ilanlar",
  robots: { index: false },
};
export async function generateMetadata() {
  const { tr } = await getTranslations();
  return { ...baseMetadata, title: tr("Kaydedilen ilanlar") };
}
export default async function Favorites() {
  const { tr } = await getTranslations();
  return (
    <div className="wrap">
      <div className="page-intro">
        <span className="eyebrow">{tr("SİZE ÖZEL SEÇKİ")}</span>
        <h1>{tr("Gözünüzün kaldığı yerler.")}</h1>
        <p className="quiet">
          {tr(
            "Beğendiğiniz ilanlar burada. Üyelik gerektirmez; yalnızca bu tarayıcıda saklanır.",
          )}{" "}
        </p>
      </div>
      <SavedListings />
    </div>
  );
}
