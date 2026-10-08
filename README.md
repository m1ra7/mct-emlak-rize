# MCT Emlak Rize — Modern tasarım

Next.js, TypeScript, Drizzle ORM, Neon PostgreSQL, Cloudinary ve korumalı işletme yönetimi.

## Yeni ziyaretçi deneyimi

- Ziyaretçi kayıt/giriş sistemi kapalıdır. Menüde hesap, giriş, kayıt veya kullanıcı ilan verme seçenekleri bulunmaz.
- Eski `/auth/*` ve `/profil/*` bağlantıları ana sayfaya yönlenir; public kayıt API'si de kapalıdır.
- İlanlar herkes tarafından üyelik olmadan görüntülenir. İletişim telefon, WhatsApp ve işletme iletişim sayfasıyla sağlanır.
- Kaydedilen ilanlar `/favoriler` yolunda bulunur. Yalnızca bu tarayıcının localStorage alanında saklanır; cihazlar arasında taşınmaz ve tarayıcı verisi silinince kaybolur. Kayıt olmadan 100 ilan kaydedilebilir.
- Ana sayfada geniş mimari hero, modern açık/koyu tema sistemi, özgün vektör logo, tek Manrope font ailesi, uyumlu başlık/metin ağırlıkları kullanılır.
- Türkçe karakterler Latin/Latin Extended font dosyalarıyla desteklenir. Fontlar ve görsel pakete dahildir; Google Fonts bağlantısı gerekmez.
- Hero görseli AI ile üretilmiş mimari konsepttir, gerçek ilan fotoğrafı değildir. İlan kartları yalnızca gerçek database kayıtları ve Cloudinary fotoğraflarını gösterir.

## macOS kurulumu

Node.js 24 önerilir; proje Node.js 24 ile kontrol edildi. [Node.js](https://nodejs.org/en/download) macOS kurucusunu yükleyin.

ZIP'i açın, Terminalde ZIP içindeki `MCT-EMLAK-RIZE` klasörüne girin:

```bash
npm install
cp .env.example .env.local
```

`.env.local` içine kendi servis ayarlarınızı yazın:

| Değişken                                            | Açıklama                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                                      | Neon PostgreSQL pooled bağlantısı; SSL seçeneklerini koruyun       |
| `BETTER_AUTH_SECRET`                                | Yönetim oturumları için en az 32 karakter rastgele secret          |
| `BETTER_AUTH_URL`                                   | `http://localhost:3000`; production'da gerçek HTTPS origin         |
| `NEXT_PUBLIC_APP_URL`                               | Aynı site adresi; SEO ve sitemap için                              |
| `CLOUDINARY_CLOUD_NAME`                             | Fotoğraf servisi cloud adı                                         |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`       | Sunucu tarafında güvenli Cloudinary yükleme                        |
| `SMTP_HOST`, `SMTP_PORT`                            | Yönetici şifre sıfırlama e-postaları için SMTP, genellikle 587/465 |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`           | SMTP hesabı ve izin verilen gönderen                               |
| `ADMIN_EMAIL`                                       | Terminalden oluşturulacak yönetici hesabının e-postası             |
| `CONTACT_PHONE`, `CONTACT_EMAIL`, `CONTACT_ADDRESS` | Sitede gösterilecek gerçek işletme iletişim bilgileri              |
| `SEED_DEMO`                                         | Normal kullanımda `false`                                          |

Secret üretme:

```bash
openssl rand -base64 48
```

Neon Console'da PostgreSQL projesi oluşturup Connect bölümünden pooled connection string'i alın. Cloudinary Console API Keys bölümünden cloud name/key/secret bilgilerini alın. Secrets hiçbir zaman kaynak koda veya Git'e yazılmaz.

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000` adresini açın. Database henüz ayarlanmamışsa ana sayfa tasarımı görünür; ilanlar için bağlantı gereklidir. Sahte kayıt veya yedek mock database kullanılmaz.

## İşletme yönetimi

Ziyaretçilere üyelik sunulmaz. İlan düzenleme/silme yetkisi herkese açık bırakılmaz: yönetim ayrı ve korumalıdır.

`.env.local` içinde kendi `ADMIN_EMAIL` adresinizi tanımlayın. Terminalde:

```bash
npm run admin:create
```

Komut yeni bir yönetici hesabını transaction içinde oluşturur, güçlü şifreyi görünmeden Terminalde sorar ve güvenli hash olarak kaydeder. Şifre en az 12 karakter olmalı. Public kayıt endpoint'i kullanılmaz. E-posta/hesap sahipliğini doğrulama sorumluluğu bu güvenli yönetim ortamındaki operatördedir.

Hesap zaten varsa `admin:create` parolayı değiştirmez. Mevcut normal kullanıcıya `admin:create` komutu otomatik yetki vermez. Güvenli Terminal ortamında işletme sahibi hesabını açıkça onarmak için `admin:repair` kullanılır. Otomasyonda gerekirse `ADMIN_INITIAL_PASSWORD` değişkeni yalnızca komut süresince environment üzerinden sağlanabilir; `.env.local` veya kaynak koda sabit parola koymayın.

Yönetim adresi: `http://localhost:3000/yonetim/giris`. Bu bağlantı ziyaretçi menüsünde gösterilmez; güvenlik gizli URL'ye dayanmaz. Oturum ve admin rolü her yönetim işleminde backend'de kontrol edilir.

- `/admin`: Gerçek database istatistikleri.
- `/admin/listings`: İlan ekleme, düzenleme, yayınlama, kaldırma, öne çıkarma, silme.
- `/admin/listings/new`: Yeni ilan; fotoğraflar ilan kaydedildikten sonra eklenir.
- `/admin/locations`: İl, ilçe, mahalle, gayrimenkul türü ekleme.
- `/admin/settings`: Danışman adı ve ilanlarda gösterilen telefon.
- `/yonetim/sifremi-unuttum`: SMTP üzerinden yönetici şifre sıfırlama.

Normal kullanıcılar yönetim API'sine işlem gönderemez. Önceki veritabanının users/messages/favorites tabloları veri kaybı oluşturmamak için korunur; ziyaretçi üyelik akışı kullanılmaz.

## Giriş hatasını kontrol etme ve onarma

Güncel proje klasöründe `.env.local` dosyanızı koruyun. `ADMIN_EMAIL` sizin yönetici e-postanız olmalı. `BETTER_AUTH_SECRET` en az 32 karakter, `DATABASE_URL` geçerli Neon PostgreSQL bağlantısı, `BETTER_AUTH_URL` tarayıcıda açtığınız sitenin adresi olmalı. Production'da gerçek alan adınız için HTTPS kullanın; yerel localhost testine HTTP ile izin verilir.

```bash
npm install
npm run admin:check
```

Kontrol komutu sunucu ayarlarını, gerçek veritabanı bağlantısını, yönetici rolünü/aktifliği, doğrulamayı ve parola hesabını inceler. Gizli bağlantı bilgilerini yazdırmaz.

Mevcut hesapla giriş yapamıyorsanız, SMTP ayarına ihtiyaç duymadan:

```bash
npm run admin:repair
```

Bu komut yalnızca `ADMIN_EMAIL` hesabını onarır: şifreyi iki kez gizli olarak sorar, Better Auth uyumlu hash oluşturur, eksik/yanlış credential kaydını düzeltir, hesabı aktif ve doğrulanmış yönetici yapar. Eski oturumları kapatır. Aynı kullanıcı kimliğini ve ilanları korur. Bu Terminal işlemi, veritabanına erişen yetkili işletme sahibinin hesap kurulumu işlemidir; herkese açık onarma endpoint'i bulunmaz.

Hesap hiç yoksa `npm run admin:create` kullanın. Ardından:

```bash
npm run admin:check
npm run dev
```

`http://localhost:3000/yonetim/giris` adresinde yeni şifreyle giriş yapın. Environment değişince sunucuyu yeniden başlatın; hosting kullanıyorsanız değişkenleri orada da tanımlayın. Rastgele bir varsayılan yönetici parolası bulunmaz.

Giriş ekranı yanlış şifre, origin uyuşmazlığı, yetki sorunu, hız limiti ve sunucu/veritabanı arızasını ayrı mesajlarla gösterir. Başarılı girişten sonra yeni oturum çereziyle tam sayfa geçişi yapılır. Yapılandırma/TypeError arızası kontrollü 503 döner; bunlar artık yanlış şifre gibi gösterilmez. Bir kullanıcının gerçek servislerindeki her 500 hatasının bu ortamda yeniden üretildiği iddia edilmez.

## Açık/koyu tema ve responsive tasarım

Üst menüdeki ay/güneş düğmesi temayı değiştirir. İlk ziyaret sistem tercihini izler, manuel seçim `mct-theme-v1` anahtarıyla tarayıcıda saklanır. Tema sekmeler arasında da güncellenir. İlk boyamada tema uygulanır; tüm ilan, yönetim ve giriş ekranları ortak renk değişkenlerini kullanır.

Fontlar aynı Manrope ailesine ait Latin ve Latin Extended unicode aralıklarıyla yüklenir. Türkçe harflerin farklı font ailesine düşmesi engellenir. Mobil form alanları 16 px, etkileşim alanları yaklaşık 44 px; 320 px küçük telefon, tablet ve masaüstü için ayrı düzenler vardır. Eski Sora varlıkları önceki sürüm kaynağı olarak tutulur, aktif tasarımda kullanılmaz.

## Güncelleme ve doğrudan yayınlama

Mevcut projeyi bu sürümle güncellerken kendi `.env.local` dosyanızı koruyun. Veritabanını silmeyin; mevcut ilanlar korunur. `npm install` çalıştırıp geliştirme sunucusunu yeniden başlatın. Yeni SQL migration gerekmez.

1. `.env.local` içindeki `ADMIN_EMAIL` mevcut aktif yönetici hesabınızın e-postasıyla aynı olmalı. Bu değişken hosting ortamında da gereklidir.
2. `/yonetim/giris` adresinden giriş yapın ve `/admin/listings` sayfasını açın.
3. Eski “onay bekliyor” ilanınızın yanındaki **Yayınla** düğmesine basın. Aynı düğme düzenleme sayfasında ve ilan önizlemesinde de vardır.
4. Yeni ilan formu **Yayında** durumunda açılır. **İlanı yayınla** kaydı doğrudan ziyaretçilere açar. Önceden hazırlamak için **Taslak** seçin.
5. **Yayından kaldır** ilanı arama, ana sayfa, favoriler ve sitemap'ten çıkarır. Tekrar **Yayınla** ile geri açabilirsiniz.

Onay sistemi kullanılmaz. Eski `pending` kayıtlar otomatik yayınlanmaz; işletme sahibinin düğmeyle verdiği karar beklenir. Bu kayıtların formu Taslak durumunda açılır. Durum değiştirme API'si, tam formu tekrar göndermeden çalışır; aktif tek işletme sahibi oturumu, origin, hız limiti ve ilan sahipliği kontrol edilir.

## İlanlar, arama ve fotoğraflar

Database schema ve migration dosyaları `db/` içindedir. Rize ve 12 ilçesi ile gayrimenkul türleri seed edilir. Mahalleler doğrulanmış bilgilerle yönetim panelinden eklenir. Yeni iller/ilçeler ilişkisel konum yapısına eklenebilir.

İlanlar Neon'dan alınır. Arama, fiyat/m², oda, konum, bina yaşı, kat, ısıtma ve boolean filtreler server-side SQL sorgularına uygulanır. Altı sıralama seçeneği ve 12 kayıt/sayfa pagination bulunur. URL filtreleri paylaşılabilir.

- Fotoğraflar Cloudinary'ye backend üzerinden yüklenir; unsigned preset gerekmez.
- JPEG/PNG/WebP, dosya başına 4 MB, ilan başına 20 fotoğraf.
- Gerçek URL/storage key/sıralama/ana fotoğraf metadata'sı Neon'da tutulur.
- Silme işleri `storage_jobs` tablosuna yazılır; geçici servis hatalarında yeniden denenebilir.

```bash
npm run storage:cleanup
```

Harita OpenStreetMap kullanır; telefon/WhatsApp bağlantıları gerçek ilan sahibi veya yapılandırılmış işletme telefonundan oluşur. İletişim bilgilerinizi mutlaka doldurun.

## Test ve production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

Dev sunucusu kapalıyken:

```bash
npm run test:http
```

Testlerin kapsamı ve dış servis sınırları `TEST-REPORT.md` içinde açıklanır. Neon, Cloudinary ve SMTP anahtarları bu teslim sırasında mevcut değildi; gerçek dış servis bağlantıları doğrulanmış sayılmaz.

Production için gerçek HTTPS domain'i, ayrı Neon branch/database, tüm environment variables ve geçerli SMTP hesabı gerekir. Güvenli yönetim ortamında production DB'ye migration/seed/admin hesabı hazırlayıp Next.js destekleyen hosting'de build/start çalıştırın. Hosting olarak Vercel veya uyumlu Node.js sunucusu kullanılabilir. Bu sürümde canlı deployment yapılmadı. Planlar/kotalar sağlayıcıya bağlıdır; ücretsiz ticari hosting taahhüdü verilmez.

İsteklerde origin kontrolü, server-side authorization, Zod validation, database rate limit, güvenli parola hash'i, parametreli ORM sorguları ve dosya boyutu/imza kontrolleri vardır. Gerçek servis kabul testleri tamamlandıktan sonra production yayınlayın.

## Tasarım varlıkları

- `components/logo.tsx`: Web için düzenlenebilir vektör marka işareti.
- `public/brand/`: Açık/koyu kullanım için SVG logo dosyaları.
- `public/images/coastal-residence.webp`: Özgün mimari konsept.
- `app/fonts/`: Manrope/Sora ve lisansları.
- `ASSETS.md`: Görsel üretim ve font kaynakları.

`node_modules`, `.next` ve gerçek `.env` dosyaları ZIP'e dahil edilmez.


Tek işletme sahibi: ADMIN_EMAIL sunucuda zorunludur. Yalnızca bu adrese bağlı aktif yönetici giriş yapabilir ve ilan ekleyebilir. Tüm ilan sorguları bu sahibin kayıtlarıyla sınırlıdır; başka hesaba ait eski kayıtlar gösterilmez. Hesap oluşturma ve kullanıcı yetkilendirme kapalıdır. Sahip ayrımı ve yapılandırma eksikliğinde ilanların gizlenmesi SQL testinde doğrulanır.

### İlan kaydetme doğrulaması

Fiyat alanına `3.250.000`, `3250000` veya `3250000,50` yazabilirsiniz. Açık adresi tamamlayın ve bulunan konumu haritada kontrol edin; koordinatlar arka planda kaydedilir. Başlık en az 10, açıklama en az 30 karakter olmalıdır; baştaki/sondaki boşluklar sayılmaz. Bulunduğu kat toplam katı aşmamalıdır. Hatalı alanın adı ve açıklaması formun üstünde görünür. Yeni sürüm için kaynak dosyalarını güncelleyin, kendi `.env.local` dosyanızı koruyun; yeni migration veya ilan silme gerekmez.

### Fotoğraf galerisi ve adres haritası

İlan detayında ana fotoğraf ve altında bütün fotoğrafların küçük önizlemeleri görünür. Ana fotoğrafa tıklayarak büyük galeriyi açabilirsiniz; sağ/sol ok, klavye okları veya telefonda kaydırma ile gezilir. Escape veya kapatma düğmesi galeriyi kapatır. Fotoğraflar tam genişlikte uzun bir şerit yerine 4:3 alan içinde gösterilir. Yeni ilanı yayınladıktan sonra genel bakışa dönülür; fotoğraf eklemek için ilan satırındaki düzenleme bağlantısını kullanabilirsiniz.

Koordinat girildiğinde OpenStreetMap işaretçisi kullanılır. Koordinat yoksa açık adres + ilçe + il ile Google Maps adres araması haritada gösterilir; kesin bina konumu için ilanı düzenleyip doğru pini seçin. Harita dış servis üzerinden yüklenir ve adresin doğru/eşleşebilir olmasına bağlıdır. Galeri ve giriş alanı düzeltmesi için güncel kaynakları birlikte kullanın; kendi .env.local dosyanızı koruyun.

### Portföy ve mobil gezinme

Satılık menüsü `/satilik`, Kiralık menüsü `/kiralik` sayfasını açar. Bu sayfalarda ilan türü sunucuda sabitlenir; yalnızca seçilen türün yayınlanmış ilanları gösterilir. Bölgeler menüsü `/bolgeler` sayfasından ilçelere göre portföyü açar. Menüde yinelenen İletişim bağlantısı kaldırıldı; sağdaki iletişim düğmesi korunur.

Portföy kartları masaüstünde iki, mobilde tek sütundur. Tablet/mobil filtreler sayfa içinde açılır; ekranı kaplayan sabit filtre katmanı kaldırıldı. URL parametreleri değişince filtre formu yeniden oluşturulur; Satılık/Kiralık geçişinde eski seçim kalmaz. Tüm kaynak dosyalarını birlikte güncelleyin ve çalışan sunucuyu yeniden başlatın; kendi `.env.local` dosyanızı koruyun.

Portföy ilk açılışta ilanları gösterir. Filtre formu varsayılan olarak kapalıdır; tüm ekranlarda “Gelişmiş arama” düğmesiyle isteğe bağlı açılır. Menüde Satılık ve Kiralık kendi türündeki bütün yayınlanmış ilanları sayfalı listeler.

İlan listesindeki “Yan yana kartlar” ve “Alt alta liste” düğmeleri görünümü değiştirir; mevcut filtreler ve sayfa URL içinde korunur. Öne çıkan işaretli ilan yoksa ana sayfadaki bağlantı “Tüm ilanları göster” olur. Eski öne çıkan bağlantısı da boş sonuç yerine açıklamayla yayındaki ilanları gösterir.

### Adresin işaretçi olarak kaydedilmesi

İlan oluşturma/düzenleme formunda açık adres, il ve ilçeyi girin; “Adresten konum bul” düğmesine basın. Doğru sonucu seçin, haritada işaretçiyi kontrol edin ve ilanı kaydedin. Seçilen enlem/boylam veritabanında saklanır; ziyaretçiler haritada aynı noktayı görür. Mevcut ilanlarınızı düzenleyip konumu bir kez seçmeniz gerekir. Adres/il/ilçe/mahalle değişirse eski koordinat temizlenir. Harita verisinde bina yoksa kesin noktayı otomatik garanti etmek mümkün değildir; haritada doğru noktaya dokunup pini sürükleyebilirsiniz.

Adres araması Nominatim üzerinden yalnızca yönetici düğmeye bastığında yapılır; sonuçlar 24 saat önbelleklenir, uygulama genelinde iki saniyede en fazla bir arama ve yönetici başına dakikada 10 arama kabul edilir. Yeni API anahtarı gerektirmez. Sağlayıcı değiştirmek için opsiyonel NOMINATIM_URL ayarlanabilir. Servis internet erişimine ve adres veri kapsamına bağlıdır. https://operations.osmfoundation.org/policies/nominatim/

İlanı kaydederken koordinat boşsa açık adres + ilçe + il otomatik aranır. Bina düzeyinde eşleşme varsa koordinatlar otomatik kaydedilir. Genel şehir/ilçe eşleşmesi kesin bina konumu olarak kaydedilmez. Önceden kaydedilmiş ilanlarda Düzenle → Kaydet işlemi aramayı tetikler. Servis hatası veya eşleşme yoksa doğru noktayı konum aracından seçmeniz istenir; konumsuz kayıt yapılmaz. Mobil alt alta görünüm artık fotoğraf solda, bilgi sağda olan tek sütunlu satırlar kullanır.


### Haritada iğne ile konum seçimi
Yönetim → ilan düzenle → Harita konumu: haritaya dokunun, iğneyi bina üzerine sürükleyin ve ilanı kaydedin. Seçilen koordinatlar ilan sayfasında OpenStreetMap işaretçisiyle gösterilir. Varsayılan Rize merkezi seçilmiş konum olarak kaydedilmez. Adres değişirse eski işaretçi temizlenir. MapLibre 6.13.0 dosyaları siteyle birlikte sunulur. OpenMapTiles tabanlı OpenFreeMap harita katmanı için internet gerekir.


### Konum alanındaki localhost engeli ve yükleme optimizasyonu
Konum seçici /map-picker.html için genel X-Frame-Options: DENY kuralı, yalnızca bu dosyada SAMEORIGIN olarak geçersiz kılınır. CSP frame-ancestors self ile başka sitelerden gömme engellenir. Diğer sayfalar DENY korumasını sürdürür. Harita JavaScript/CSS dosyaları yereldir; sürümlenmiş Leaflet dosyaları uzun süre önbelleğe alınır, seçici sayfa yeniden doğrulanır.
Mobil harita varsayılan olarak sayfanın dikey kaydırılmasına izin verir; Haritayı taşı düğmesi harita üzerinde gezinmeyi açar. Harita ve ilan fotoğrafları gerektiğinde yüklenir. İlan fotoğrafı sizes değerleri mobil kart ve liste genişliklerine göre ayarlanmıştır.
Güncelleme: yeni dosyaları uygulayıp çalışan sunucuyu yeniden başlatın. Geliştirmede npm run dev; üretimde npm run build ardından npm start. next.config.ts değişikliğinin uygulanması için eski çalışan süreç kullanılmamalıdır. Eski bir ilanın konumunu değiştirmek için ilanı düzenleyin, noktaya dokunun ve kaydedin.
Kontrol: npm test, npm run lint, npm run typecheck, npm run build. Üretim HTTP testi: SMOKE_PRODUCTION=true npm run test:http (önce build gerekir).


### MCT dairesel marka logosu
Logo bileşeni yenilendi: dolu koyu yeşil çember, altın dağ hattı, açık renk ev ve deniz dalgaları. Manrope MCT yazısı ve EMLAK RİZE alt başlığı kullanılır. Mobil simge 46px, masaüstü 54px. public/logo-mark.svg bağımsız vektör amblem, public/favicon.svg aynı marka simgesidir.


### Ana görsel kartı
İYİ BİR HAYATIN BAŞLANGICI kartının beyaz yüzeyi, deniz ve doğa tonlarıyla uyumlu yarı saydam yeşil-mavi degrade ve arka plan bulanıklığıyla değiştirildi. Yazı ve ikon kontrastı her iki tema için açık tonlarda ayarlandı.


### Seçili favori rengi
Favori düğmesinin seçili durumu tema uyumlu mint zemin, kontrastlı yeşil kalp ve yeşil çerçeve kullanır. Koyu temada soluk yeşil üzerine soluk yeşil sorunu giderildi. Klavye odağı görünürdür.


### Mobil yönetim ve konum silme
Yönetim menüsü 1000px altında iki sütun olarak görünür. 640px altında ilan yönetim tablosu kartlara dönüşür; istatistikler iki sütun, formlar tek sütun olur. Dokunma hedefleri en az 44px, mobil giriş alanları 16px olarak düzenlendi.
/admin/locations bölümünde il başlığını açın: il, ilçe ve mahalle satırlarında Sil düğmesi bulunur; gayrimenkul türleri de silinebilir. Silme öncesi onay alınır. İlanı veya alt kaydı olan konumlar veritabanı kısıtlarıyla korunur, HTTP 409 ve anlaşılır mesaj döner. Önce bağlı ilanların konumunu değiştirin, mahalleleri ve ardından ilçeleri silin. Kullanılmayan kayıtlar kaldırılır, sayfa yenilenir. Yeni veritabanı migration işlemi gerekmez.


### Arsa, fiyat ve yakın çevre
Arsa/arazi/tarla türlerinde oda, bina yaşı, kat, ısıtma, banyo ve konuta özgü seçenekler gizlenir; bunlar ilan detayında ve kartlarında gösterilmez. Konut doğrulaması zorunlu alanları korur. Pazarlık, imar durumu ve kat karşılığı seçenekleri mevcut listing_features tablosuna kaydedilir; migration gerekmez.
Konum seçici ve koordinatlı ilan haritası yerel MapLibre GL JS 6.13.0 ile OpenFreeMap Liberty/OpenMapTiles katmanını kullanır. Katman servisini biz sürümlemiyoruz; sağlayıcının sunduğu veriler görüntülenir.
Yakın çevre: konum kaydedilmişse yeni ilan kaydından sonra arka planda analiz başlatılır. Detay bölümü ekrana yaklaşınca veriler otomatik yüklenir. 5 km içindeki adlandırılmış OSM noktaları Overpass üzerinden alınır, tekrarlar elenir, en fazla 80 sonuç önbelleğe alınır. Varsayılanda kategori başına en yakın 3 nokta (en fazla 24), tek kategoride en yakın 10 sonuç gösterilir. Parklar Spor kategorisindedir. Yerler ve koordinatlar örnek verilerden üretilmez; OSM kayıt kapsamına bağlıdır.

### Adres ve gerçek rota kurulumu
Açık adres alanından çıkınca otomatik arama yapılır; tek hassas sonuç bulunursa pin otomatik yerleşir. Belirsiz sonuçlarda adres önerileri seçilir. Haritaya tıklamak veya pini sürüklemek mümkündür; kullanıcı enlem/boylam girmek zorunda değildir. Koordinatlar mevcut veritabanı alanlarında tutulur, migration gerekmez. Adres değişirse eski pin temizlenir; eski arama yanıtı yeni adres veya elle seçilen pini geçersiz kılamaz. Kaydetme sırasında da koordinatsız adres bir kez çözülmeye çalışılır. Serviste kayıtlı olmayan adres için otomatik kesin bina konumu garantisi yoktur; haritada düzeltin. Kesin konum bulunamayan yeni/düzenlenen ilan, pin seçilene kadar 422 açıklamasıyla kaydedilmez; sessizce konumsuz yayınlanmaz. Public Nominatim autocomplete kullanımını yasakladığı için her tuş vuruşunda sorgu gönderilmez. Tamamlanan adres için sonuç önerileri sunulur; arama 24 saat cache ve global hız sınırı kullanır.

Yaya ve araç gerçek rota süreleri için ücretsiz kotası olan openrouteservice hesabının anahtarını sunucuda ORS_API_KEY olarak ayarlayın. İki ayrı matrix profili foot-walking ve driving-car kullanılır; anahtar tarayıcıya gönderilmez. Alternatif: kendi OSRM araç sunucunuz OSRM_URL ve foot.lua ile hazırlanmış ayrı yaya sunucunuz OSRM_FOOT_URL. Sadece URL yolunu walking yapmak araç verisini yaya rotasına dönüştürmez. Anahtar/yaya sunucusu yoksa varsayılan OSRM yalnızca araç verisi sunar, yaya süresi “mevcut değil” olarak gösterilir. Servis başarısız veya rota bulunamazsa süre uydurulmaz; kuş uçuşu mesafe açıkça etiketlenir. Araç süreleri canlı trafiği içermez. Matrisler kategori başına en yakın 3 nokta için hesaplanır; diğer noktalar kuş uçuşu mesafe ve dış yol tarifi bağlantısı sunar.

Liste ve harita aynı kategori filtresini kullanır. Kartın Haritada göster düğmesi noktaya odaklanır; marker adı, kategori ve kuş uçuşu mesafeyi güvenli DOM içeriğiyle açar. Marker seçimi ilgili kartı vurgular. İlan ev/arsa simgesiyle ayrı görünür. Mobilde kategoriler yatay kaydırılır, harita üstte ve kartlar tek sütundadır. Harita dokunma hareketi varsayılan olarak sayfa kaydırmasını engellemez.

Servis uçları NOMINATIM_URL, OVERPASS_URL, OSRM_URL, OSRM_FOOT_URL ve ORS_URL ile değiştirilebilir. Yakın çevre 24 saat cache, global servis ve ziyaretçi hız sınırı kullanır. Harita internet ve WebGL gerektirir. Bu çalışma ortamında gerçek sağlayıcı ve cihaz tarayıcısı testi yapılamadı; otomatik testler kontrollü servis yanıtlarını, mesaj güvenliğini, SQL kayıtlarını ve üretim HTTP yanıtlarını doğrular. Canlı sistemde anahtar, sağlayıcı erişimi ve Rize adres kapsamı ayrıca kontrol edilmelidir.

Kaynaklar: https://operations.osmfoundation.org/policies/nominatim/ · https://project-osrm.org/docs/v26.4.0/http · https://openrouteservice.org/dev/ .

### Konum düzeni ve kat karşılığı
İlan detayında önce Konum, açık adres ve harita; ardından Çevrede Neler Var?, yatay kategori şeridi ve yan yana kaydırılan yakın yer kartları görünür. Kartlar mobilde tek sıra halinde yatay kaydırılır; sayfanın dikey kaydırması korunur. Öne çıkan etiketi iki temada sabit koyu yeşil yazı ve mint yüzeyle kontrastlıdır.
Arsa ilanında Kat karşılığına uygun seçildiğinde fiyat alanı gizlenir ve fiyat yerine bu ifade kartlarda, detayda ve yönetim listesinde görünür. Bu ilanlar mevcut zorunlu pozitif numeric fiyat alanında teknik yer tutucu 1 saklar (satış fiyatı olarak gösterilmez); normal ilanlarda sıfır fiyat reddedilir. Fiyat görünümünü mevcut Kat karşılığı özelliği belirler, migration gerekmez.

### Türkiye’nin bütün illeri ve ilçeleri
Güncel kaynakları uyguladıktan sonra /admin/locations içindeki “Türkiye’nin tüm il, ilçe ve mahallelerini ekle” düğmesine basın veya kendi veritabanı ortamınızda npm run db:seed çalıştırın. Projeye gömülü TurkiyeAPI ad listesinden 81 il ve merkez ilçeler dahil 973 konum eklenir; çalışma sırasında dış servise ihtiyaç yoktur. Mevcut il/ilçe kimlikleri, mahalleler ve ilan bağlantıları korunur; tekrar çalıştırmak aynı kayıtları çoğaltmaz. Özel konumlar silinmez. 32.279 kaynak kaydından aynı ilçede aynı adlı mahalleler birleştirilerek 31.947 mahalle seçimi eklenir. İlçe seçildiğinde yalnızca o ilçenin mahalleleri yüklenir; yönetimde “Mahalleleri göster” ile seçilen ilçenin kayıtları açılır. Kaynak ve MIT lisansı db/seed/LOCATION-DATA-SOURCE.md ve TURKIYEAPI-LICENSE.txt içindedir. Bu çalışma ortamında canlı Neon veritabanı erişimi yoktur; aktarımı yukarıdaki düğme veya komutla kendi ortamınızda başlatın.

### Adres araması, bölgeler ve daire özellikleri
Adres yeniden yazıldığında arama imzası sıfırlanır. Tamamlanan adres normalize edilir (bölü çizgileri virgüle, No: bina numarasına, Rize Merkez yalnızca Rize’ye). Tek bina eşleşmesi otomatik seçilir; tek sokak eşleşmesi sokak konumu uyarısıyla seçilir. Şehir merkezi kesin ilan konumu sayılmaz. Birden fazla sokak/bina sonucu varsa doğru sonucu seçin; bina pinini sürükleyerek düzeltin. Otomatik sorgu adres alanından çıkınca yapılır; public Nominatim’e tuş başına autocomplete gönderilmez.
Bölgeler /bolgeler sayfası önce illeri listeler; il kartı /bolgeler?city=... ile yalnızca ilgili ilçeleri açar. Mimari konsept görseli alt yazısı kaldırıldı. Daire formuna Tapu Durumu, Kullanım Durumu, Site İçerisinde ve Net alan eklendi. İç/Dış Özellikler öneri veya serbest etiket olarak eklenir ve çıkarılır, mevcut listing_features tablosunda saklanır. Detayda oda, banyo, brüt/net alan, bina yaşı, kat sayısı ve bulunduğu kat ikonlu ayrı kutudadır. Ek migration gerekmez. Canlı Nominatim Rize Atatürk Caddesi yanıtı ve bina/sokak/şehir/belirsiz sonuç senaryoları kontrol edilmiştir; her bina numarasının servis verisinde bulunduğu garanti edilmez.

### İlan fiyatı ve isteğe bağlı brüt/net alan
Fiyat ilan detayının yan iletişim panelinden İlan özellikleri bölümüne taşındı. Brüt alan ve net alan ayrı girişlerdir; boş bırakılabilir. Boş brüt alan SQL NULL olarak kaydedilir, boş net alan belirtilmemiş olarak saklanır ve gösterilir. Brüt alan verildiğinde pozitif tam sayı doğrulaması korunur. Güncelleme sırası: kaynakları uygulayın, kendi DATABASE_URL ortamınızda npm run db:migrate çalıştırın, npm run build ardından sunucuyu yeniden başlatın. 0002 migration yalnızca area_m2 NOT NULL kısıtını kaldırır; mevcut değerleri ve ilanları silmez. Canlı veritabanına bu ortamdan bağlantı olmadığı için migration kendi ortamınızda çalıştırılmalıdır.

### Sade fiyat, form sırası ve ilk kayıtta fotoğraf
İlan detayında özellik başlığı kaldırıldı, fiyat sol sütunda özellik panelinin üstünde kutusuz gösterilir. Genel işletme iletişim düğmesi kaldırıldı; telefon ve WhatsApp bağlantıları korunur. Tapu, kullanım durumu ve net alan haritanın önüne taşındı.
Yeni ilan formu tek seferde en fazla 20 JPG/PNG/WebP (dosya başına 4 MB) seçer. İlan kayıt ID’si alındıktan sonra mevcut korumalı images API’siyle dosyalar yüklenir; yüklemeler tamamlanınca genel bakışa yönlenir. Kısmi hata halinde sayfayı kapatmadan tekrar kaydetmek aynı ilanı günceller ve başarılı dosyaları yeniden yüklemez. Cloudinary bağlantısı gerekir; bu ortamda gerçek Cloudinary yüklemesi test edilemedi.
Adres alanından arama düğmesine geçiş artık iki sorguyu tetiklemez. Aynı adresin eşzamanlı sorguları birleştirilir. Global Nominatim hız sınırında en fazla üç bekleyerek tekrar deneme yapılır; bina ve mahalle verisi bulunamazsa gerçek sokak sonuçları sunulur. İl/ilçe eksik olduğunda sessizce durmak yerine açıklama gösterilir. Otomatik arama alan dışına çıkınca çalışır; belirsiz sonuçlar kullanıcı seçimi gerektirir.

Son fiyat düzeni: masaüstünde fiyat sağdaki iletişim panelinin başında; 900px ve altında fotoğraf galerisinin hemen altında görünür. İki gösterim CSS ile karşılıklı gizlenir. Brüt Alan ve Net Alan diğer özelliklerle aynı liste düzenindedir; arsa için tek başına büyük alan kutusu gösterilmez.

Kiralık dairelerde WC sayısı isteğe bağlıdır. Boş bırakıldığında özellik gösterilmez; düzenlerken temizlenirse kayıt kaldırılır. Satılık ve diğer gayrimenkul türlerinde bu alan açılmaz.
