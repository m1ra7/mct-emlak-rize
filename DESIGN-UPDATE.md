# MCT Emlak Rize — Tasarım güncellemesi

MIRACSOFT’un son ürün odaklı yüzey ve gölge düzeni, mevcut MCT renkleri korunarak uygulandı.

- Kart köşeleri 12 px, iç fotoğraf köşeleri 8 px olacak şekilde birleştirildi.
- Açık ve koyu temada ortak gölge ölçeği eklendi; hover sırasında kartların konumu değişmez.
- Üst menü, arama alanı, kategori kartları, portföy sekmeleri, bölge ve iletişim alanları sadeleştirildi.
- İlan detayları ve yönetim panelleri aynı yüzey ölçülerini kullanır.
- Mevcut renk değişkenleri, logo, içerik, dil seçimi ve veri akışları korunur.
- Yeni görünüm app/product-theme.css dosyasında toplanır; diğer stillerden sonra yüklenir.

Doğrulama: production build, ESLint ve TR/EN/DE HTTP kontrolleri başarılı. Derlenmiş sayfanın statik görüntüsünde açık/koyu tema ve mobil kartlar incelendi; 375 px içerik genişliğinde yatay taşma yok. Görsel inceleme için kullanılan örnek kartlar sadece ayrı test klasöründedir; kaynak pakette ve veritabanında yer almaz. Canlı veritabanı ve yönetici oturumu bu ortamda yapılandırılmadığından ilan yayınlama veya yönetici işlemleri yeniden denenmedi.
