import { SavedListings } from "@/components/local-favorites";
export const metadata = {
  title: "Kaydedilen ilanlar",
  robots: { index: false },
};
export default function Favorites() {
  return (
    <div className="wrap">
      <div className="page-intro">
        <span className="eyebrow">SİZE ÖZEL SEÇKİ</span>
        <h1>Gözünüzün kaldığı yerler.</h1>
        <p className="quiet">
          Beğendiğiniz ilanlar burada. Üyelik gerektirmez; yalnızca bu
          tarayıcıda saklanır.
        </p>
      </div>
      <SavedListings />
    </div>
  );
}
