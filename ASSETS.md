# Tasarım varlıkları

## Mimari hero görseli

Dosya: `public/images/coastal-residence.webp`.

Yerleşim: ana sayfa hero; 16:9 manzara, solda metin alanı, sağda çağdaş konut.

Built-in ImageGen ile özgün olarak üretildi; WebP olarak kodlandı. Gerçek Rize binası veya gerçek ilan fotoğrafı değildir. Gerçek ilanlar yalnızca database/storage entegrasyonundan gelir.

Üretim promptu:

> Editorial architectural photograph of a contemporary black and white concrete residence with floor-to-ceiling glazing, nestled among lush evergreen green hills overlooking a calm deep blue coastal sea. Inspired by the Black Sea landscape, fictional architecture, not a real listing. Wide cinematic 16:9 frame; residence on the right, open sea and shadowed leafy foreground on the left for white headline overlay. Rich emerald greens, charcoal slate, soft ivory concrete, warm indoor lighting, overcast coastal golden-hour atmosphere, tactile natural materials, sophisticated realistic photography. No people, text, letters, logo, watermark or interface.

## Fontlar

Manrope Variable ve önceki sürümün Sora Variable dosyaları Fontsource npm paketlerinden alınmıştır. Aktif Manrope Latin/Latin Extended WOFF2 dosyaları `app/typography.css` içinde aynı aile adı ve unicode aralıklarıyla yerel olarak yüklenir. Lisansları `app/fonts/` içindedir. Font yüklenmesi için Google Fonts sunucusuna bağlantı gerekmez.

## Logo

MCT marka işareti geometrik mimari çizgilerden kodla oluşturulmuştur. Web kilidi `components/logo.tsx`; tekrar kullanılabilir açık/koyu SVG sürümleri `public/brand/` içinde bulunur. Icon'lar Lucide React paketindendir.


6 Ekim 2026: Aktif tipografi tek Manrope ailesiyle güncellendi. `public/fonts/` dosyaları Latin/Latin Extended unicode aralıklarıyla aynı MCT Sans aile adı altında yüklenir; lisans `app/fonts/` içindedir. Sora artık aktif arayüzde kullanılmaz.
