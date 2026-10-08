# Modern sürüm doğrulaması — 6 Ekim 2026

## Kapsam

Bu sürüm ziyaretçi üyeliğini kaldırır, public signup'ı kapatır ve işletme yönetimini ayrı korur. Ziyaretçi favorileri localStorage'a taşınmıştır. Tasarım ve font sistemi yenilenmiştir. Kalıcı dark mode ve yönetici hesabı onarma/kurulum kontrolü eklendi.

## Otomatik kontroller

- Lint ve TypeScript kontrolü.
- Next.js production build.
- Yeni ilanların yayın varsayılanı; eski pending durumunun taslak olarak açılması.
- SQL üzerinde eski bekleyen ilanı yayınlama, kaldırma, yeniden yayınlama; ilk yayın tarihinin korunması.
- Başka hesabın sahiplik filtresiyle yayın durumunu değiştirememesi.
- Başka aktif adminin giriş yapamaması.
- Geçici PGlite PostgreSQL'de SQL migration/foreign key/unique/cascade kontrolleri.
- Public kayıt çağrısının reddedilmesi.
- Operatör tarafından oluşturulmuş admin hesabının giriş/session/çıkış ve reset token yaşam döngüsü.
- Pasif hesabın yeni session oluşturamaması.
- Origin ve sahiplik kontrolleri, input ve dosya imzası doğrulaması.
- HTTP: oturumsuz yayın durumunu değiştirme 401, başka origin ile değiştirme 403.
- HTTP smoke: ana sayfa, iletişim, favoriler ve ayrı yönetim erişimi; eski kayıt/giriş/profil yollarında yönlendirme; oturumsuz admin erişiminde yönlendirme.

## Yeni giriş ve tema doğrulamaları

- 7 otomatik test grubu: önceki SQL/izin kontrollerine ek olarak production ayarları ve gerçek Better Auth HTTP handler akışı.
- Eski pasif, normal rol ve hatalı credential kaydına sahip işletme hesabının onarılması; kullanıcı kimliği korunur, eski oturumlar iptal edilir.
- HTTPS production origin altında SMTP olmadan yönetici girişinin 200 dönmesi; Secure/HttpOnly çerezi, get-session, çıkış ve oturum iptali.
- Yanlış parola 401, başka origin 403; public signup reddi.
- TypeError/service arızasının kontrollü 503'e dönüşmesi ve yanlış parola mesajından ayrılması.
- Eksik/yanlış secret, site adresi, local HTTP ve development loopback origin ayarları.
- Tema ilk boyama kodu: açık/koyu manuel seçim, sistem tercihi, geçersiz seçim ve storage engeli.
- HTTP smoke: eksik sunucu ayarıyla giriş isteği 503; tema düğmesi/ilk boyama script'i ve iki yerel font varlığı erişilebilir.

## Dış servis sınırları

Gerçek Neon, Cloudinary ve SMTP anahtarları mevcut değildi. Bu hesaplara bağlanma, fotoğraf yükleme/silme, e-posta teslimatı ve tüm CRUD akışları gerçek servislerle yeniden doğrulanmalıdır. PGlite uygulamanın çalışma zamanı database'i değildir.

Tarayıcı görsel kontrolü denendi ancak ortamda tarayıcı başlatılamadı. Tam tarayıcı/mobile görsel QA doğrulanmış sayılmaz; responsive düzen ve Türkçe karakter desteği kaynakta yer alır. Mac cihazında çalıştırma yapılmadı; macOS kurulum adımları README'de bulunur.

## Yayın öncesi kontrol

1. Servis ayarlarıyla migration/seed çalıştırın; Terminalden admin oluşturun.
2. İlanı oluşturun, Cloudinary fotoğrafı yükleyin, yayınlayın; arama/filtre/sıralama/detail/sitemap'te görünsün.
3. Ziyaretçi menüsünde kayıt/giriş olmadığını ve signup API'sinin reddedildiğini kontrol edin.
4. Aynı tarayıcıda ilanı kaydedin, `/favoriler` sayfasına gidin, yenileyin ve çıkarın; üyelik istememeli. İkinci sekmede storage değişikliği görünmeli.
5. İlan kaldırıldığında kaydedilenlerde public verisi dönmemeli.
6. Oturum olmadan veya admin rolü olmadan CRUD/yönetim işlemleri reddedilmeli.
7. 375/768/1440 px ekranlarda Türkçe metinler, logo, form, galeri ve yatay taşma kontrolü yapın.
8. Gerçek SMTP ile admin şifre sıfırlama; gerçek HTTPS origin ve cookies kontrolü yapın.

Başarılı build, dış servislerin production'da test edildiği anlamına gelmez.


Tek işletme sahibi: ADMIN_EMAIL sunucuda zorunludur. Yalnızca bu adrese bağlı aktif yönetici giriş yapabilir ve ilan ekleyebilir. Tüm ilan sorguları bu sahibin kayıtlarıyla sınırlıdır; başka hesaba ait eski kayıtlar gösterilmez. Hesap oluşturma ve kullanıcı yetkilendirme kapalıdır. Sahip ayrımı ve yapılandırma eksikliğinde ilanların gizlenmesi SQL testinde doğrulanır.

## İlan doğrulama ve ölçü düzenlemesi (sürüm 4)

- 8 test grubu geçti. Yeni test, POST JSON gövdesini gerçek JSON okuyucusundan geçirip production ile ortak ilan kaydetme fonksiyonunu PostgreSQL uyumlu PGlite üzerinde çalıştırır.
- Türkçe fiyat (3.250.000,50), düz fiyat, boş isteğe bağlı konum alanları, doğrudan published oluşturma, düzenlemede ilk yayın tarihini koruma ve özelliklerin değiştirilmesi doğrulandı.
- Boş/yanlış sayı, yalnızca boşluk içeren başlık, eksik koordinat, geçersiz kat ve ondalıklı alan için alan isimli 400 yanıtları; il/ilçe eşleşmesi ve başka sahibin ilanına erişim reddi doğrulandı.
- Kullanıcının gerçek 400 isteğinin gövdesi ve Neon hesabı mevcut değildi; bu isteğin tek kesin nedeni yeniden üretilemedi. İstemci ve sunucu ortak doğrulama kullanır; gerçek yanıtta hangi alanın düzeltileceği artık görünür.
- Orta boy başlıklar, okunabilir yardımcı metinler, ortak kontrol/padding ölçüleri, kompakt logo ve mobil form düzeni güncellendi. Görsel tarayıcı doğrulaması bu ortamda yapılmadı.

## Kart ikonu hizalama düzeltmesi (sürüm 5)

“Yeni eviniz” kartına özgü eski `padding-left: 0` kuralı kaldırıldı. Mobildeki ilk karta özgü padding seçicisi de kaldırıldı; üç kategori kartı ortak masaüstü/tablet/mobil boşluklarını kullanır. Kaynak kontrolü yapıldı; tarayıcı görsel kontrolü yapılmadı.

## Ekran görüntüsüne göre kategori kartları (sürüm 6)

İlk kartın kenara yapışan ikonu ve son kartın eksik çerçevesi kullanıcı ekran görüntüsünde görüldü. Üç Link öğesine category-card sınıfı eklendi; son yüklenen stylesheet içinde ilk/son kart dahil padding ve çerçeve açıkça tanımlandı. İkon/metin/ok sabit grid kolonları kullanır. Bu değişiklik için app/page.tsx ve app/design-system.css birlikte güncellenmelidir. Yeni görünüm tarayıcıda görsel olarak doğrulanmadı.

## Giriş alanı, mobil düzen, galeri ve harita (sürüm 7)

Kullanıcının giriş ekranı görüntüsündeki autofill arka planına iç padding ve kenar boşluğu eklendi. Mobil giriş kontrolleri 16px yazı, 44px etkileşim alanı ve 320px için düzenlenmiş iç boşluklar kullanır. İlan detayı, galeri ve özellikler tablet/mobilde tek sütun veya iki sütunlu özellik kartlarıyla düzenlenir.

Tüm fotoğraflar ana fotoğraf altında önizlenir; ana fotoğrafa tıklayınca native modal dialog açılır. Klavye okları, Escape ve mobil kaydırma desteklenir; dialog açıkken arka sayfanın kaydırması kilitlenir. İlk fotoğraf işletme sahibinin ana fotoğraf seçimidir. Eski galerinin overflow:hidden sebebiyle diğer resimleri gizleyen düzeni kaldırıldı.

Yayınlama formu ve tek tıklama yayınlama aksiyonu başarıdan sonra /admin genel bakışa gider. Taslak kaydı düzenleme sayfasına gider.

9 test grubu, lint ve üretim derlemesi geçti. Harita testi URL içindeki tam adresin doğru kodlanmasını ve koordinat (0,0 dahil) önceliğini doğrular. Gerçek Google Maps adres eşleşmesi, dış servisler ve tarayıcı/mobil görsel/etkileşim kontrolü bu ortamda doğrulanmadı.

## Portföy, menü ve mobil kaydırma (sürüm 8)

- Portföyün 280px filtre sütunu + iki geniş ilan sütunu; 1100px altında akış içinde açılan filtre; 759px altında tek kart sütunu tanımlandı. Kartlar ve sonuç alanı minmax/min-width ile yatay taşmayı önler.
- Eski fixed/inset mobil filtre katmanı bu sayfada static/inset:auto olarak sıfırlandı. Galerinin body.style.overflow değiştirmesi kaldırıldı; sayfadan ayrılınca kalabilecek JS kaydırma kilidi kullanılmıyor.
- Satılık/Kiralık ayrı sunucu sayfaları ilan türünü query parametreleri üzerinden değiştirilemeyecek şekilde zorlar. Form seçimleri query değiştiğinde yeniden başlatılır.
- Gerçek production arama fonksiyonu PGlite ile test edildi: bir satılık, bir kiralık ve bir taslak kayıtla satılık/kiralık sorguları yalnızca doğru kaydı döndürdü; tüm public sonuçlarda taslak dışlandı. 9 test grubu, lint, üretim derlemesi ve HTTP smoke geçti.
- Bölgeler ayrı ilçe sayfasını açar. Sol menüdeki yinelenen iletişim bağlantısı kaldırıldı.
- Gerçek mobil tarayıcıda kaydırma/görsel kabul testi ve kullanıcının gerçek servis bağlantısı bu ortamda doğrulanmadı.

## Önce ilanlar, isteğe bağlı gelişmiş arama (sürüm 9)

Gelişmiş arama formu başlangıçta JSX içinde hiç render edilmez; yalnızca düğmeye basılınca açılır. Masaüstünde de filtre yan sütunu kaldırıldı. İlanlar tam genişlikte 3/2/1 sütunla gösterilir. Satılık/Kiralık menüsü sabit tür sayfalarını doğrudan açar. Üretim derlemesi ve lint geçti; mobil görsel doğrulama yapılmadı.

## Dar sütun çakışması ve tür bağlantıları (sürüm 10)

Ekran görüntüsünde sonuçların dar sütuna sıkıştığı görüldü. Genel filters/grid sınıfları portföyde portfolio-layout/listing-cards ile değiştirildi; auto-fill min 320px kartlar ve mobil tek sütun kullanılır. Tür sayfaları forcedType ile sorguyu ve başlığı belirler. Ana sayfanın Satılık/Kiralık sekmeleri artık yalnızca yerel seçim değiştirmek yerine doğrudan ilgili ilan sayfasına gider. Derleme ve lint geçti; yeni görüntü tarayıcıda doğrulanmadı.

## Görünüm seçenekleri ve öne çıkanlar (sürüm 11)

Yan yana kart/alt alta liste görünümü query parametresi ile eklendi; görünüm değişikliği mevcut sorgu ve sayfayı korur, pagination view parametresini taşır. Mobil liste görünümü tek sütuna uyarlanır. Öne çıkan kayıt yokken ana sayfa recent kartları gösteriyordu ancak bağlantı featured=true arıyordu; bağlantı artık görünen kartlarla uyumludur. Eski featured bağlantısının boş sonucunda açık bir açıklamayla yayınlanmış sonuçlara dönülür. Lint ve production build geçti. Tarayıcı görsel kontrolü yapılmadı.

## Adresten konum bulma ve işaretçi (sürüm 12)

Sadece yöneticiye açık same-origin POST /api/manage/geocode eklendi. Adres + veritabanında doğrulanan il/ilçe sorgusu, geçerli koordinat sonuçları, global/user rate limit, timeout, günlük cache ve OSM attribution kullanılır. Kullanıcı sonuçlardan doğru noktayı seçer; mevcut listing-save koordinatları saklar. Formdaki konum önizlemesi aynı işaretçiyi gösterir. Adres değişince eski koordinatlar/sonuçlar temizlenir; bekleyen aramanın adres değişikliğinden önceki sonucu uygulanmaz.

10 test grubu geçti; geçersiz sağlayıcı sonuçlarının reddi ve seçilen noktanın doğru map marker parametresine dönüşmesi doğrulandı. Lint ve build geçti. İlk derleme eski Turbopack persistence cache hatasıyla durdu; temiz cache ile derleme geçti. Gerçek Nominatim sorgusu, kullanıcı adresinin eşleşmesi, Neon bağlantısı ve tarayıcı önizlemesi bu ortamda doğrulanmadı. Yanlış/eksik adresin tam bina konumuna otomatik dönüşümü garanti edilmez; kullanıcı sonucu kontrol eder.

## Mobil satırlar ve kayıtta otomatik konum (sürüm 13)

Mobil liste modundaki kartlara dönüş kuralı kaldırıldı; fotoğraf/bilgi iki sütunlu satır olarak kalır. Koordinat boşsa authenticated listing POST/PATCH içinde tam adres + ilçe + il aranır. place_rank >=28 eşleşmesi bulunduğunda koordinat kaydedilir; şehir/ilçe merkezleri kesin bina noktası olarak otomatik kaydedilmez. Servis hatası ilan kaydını durdurmaz. Kullanıcının gerçek adresi ve dış servis eşleşmesi bu ortamda doğrulanmadı; kesin doğruluk garanti edilmez. Testler, lint ve build geçti.

## Mobil menü boşlukları (sürüm 15)

Kullanıcı ekran görüntüsünde aktif alt menü öğesinin genişliği diğerlerinden farklıydı. 1000px ve altında dört eşit grid hücresi, aynı 60px yükseklik/padding ve aynı ikon boyutu tanımlandı; menünün görünürlüğü açıkça belirlendi. Sayfa altı safe-area boşluğu artırıldı. Üretim derlemesi geçti; mobil tarayıcıda görsel kabul testi yapılmadı. Konum sorunu çözülmüş sayılmaz: gerçek Açık adres/il/ilçe ve sağlayıcı yanıtı henüz alınmadı. Bu sürümde geocoding davranışı değiştirilmedi.


### İğneyle konum seçimi
ESLint, 10 test grubu ve üretim derlemesi geçti. Yönetim haritasında tıklama ve sürükleme koordinat alanlarını günceller; aynı origin ve iframe kaynağı kontrol edilir. Geçersiz koordinatlar reddedilir. Canlı CDN, mobil dokunma ve gerçek veritabanı üzerinde bu yeni arayüzün uçtan uca testi yapılamadı.


### 7 Ekim 2026 — iframe engeli ve performans
- Kök neden: next.config.ts tüm yanıtları X-Frame-Options: DENY ile sunuyordu. Aynı siteye ait harita seçici de iframe içinde engelleniyordu.
- Üretim sunucusu HTTP kontrolü: /map-picker.html 200; X-Frame-Options SAMEORIGIN; CSP frame-ancestors self. Yönetici giriş sayfası DENY. Yerel JS/CSS dosyaları 200; Leaflet Cache-Control immutable doğrulandı.
- 11 test grubu geçti: seçicinin tıklama/sürükleme davranışları VM içinde çalıştırıldı, aynı origin ve kaynak filtresi, koordinat eşitlemesi, boş konumda pin kaldırma ve mobil kaydırma düğmesi kontrol edildi. Gerçek tarayıcı dokunma testi değildir.
- PGlite ilan kayıt testi seçilen koordinatların veritabanında korunmasını doğruladı. Gerçek Neon kimlik bilgileri olmadan canlı veri akışı denenmedi.
- ESLint, TypeScript ve üretim derlemesi geçti. Liste/kart fotoğraflarının sizes değerleri CSS kırılma noktalarına göre güncellendi; indirme süresi ölçümü yapılmadı.
- Tarayıcı kurulumu geçerli arşiv indirmediğinden görsel/mobil tarayıcı doğrulaması yapılamadı. Harita döşeme servisinin canlı görünümü doğrulanmadı.


### Logo güncellemesi
ESLint ve üretim derlemesi geçti. Vektör amblem ve favicon güncellendi. Gerçek tarayıcıda görsel doğrulama yapılamadı.


### 7 Ekim — mobil yönetim ve konum silme
11 test grubu geçti. PGlite üzerinde kullanılan il/ilçe/tür silmenin engellenmesi; ilçe ve mahalle bağlantılarının korunması; kullanılmayan mahalle, ilçe, il ve türün silinmesi; olmayan kayıt için 404 kontrol edildi. RESTRICT ve FOREIGN KEY hata kodları anlaşılır HTTP 409 yanıtına dönüştürülür.
ESLint ve üretim derlemesi geçti. HTTP smoke testi anonim silme 401 ve yabancı origin ile silme 403 kontrolünü içerir. Gerçek Neon üzerinde silme yapılmadı; mobil gerçek tarayıcı görsel testi yapılamadı.


### Arsa + OpenMapTiles + yakın çevre
Üretim derlemesi, TypeScript ve 12 test grubu geçti. Yeni arsa kaydı konut alanları olmadan PGlite üzerinde kaydedildi; yanlış tür ile arsa bayrağı reddedildi. Pazarlık/imar/kat karşılığı özelliklerinin kayıt yoluna gönderilmesi test fixture'ında yer alır. Mesafe, kategori, kopya kayıt eleme ve geçersiz koordinatları reddetme testleri geçti. Vektör harita tıklama/sürükleme ve salt okunur konum VM testinden geçti; gerçek WebGL tarayıcı testi değildir.
Canlı Overpass denemesi bu ortamdan HTTP 406 döndü; canlı yer sonuçları ve OSRM araç süreleri doğrulanamadı. Gerçek Neon/Vercel ve mobil görsel kabul testi yapılmadı.
