import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import settingsService from '../services/settings.service'; // Restoran ayarlarını almak için
import type { SiteSettings } from '../services/settings.service';

const PrivacyPolicy = () => {
  const [settings, setSettings] = useState<SiteSettings>({});

  // Restoran ayarlarını yükle
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const siteSettings = await settingsService.getSettings();
        setSettings(siteSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst Başlık ve Logo */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            {settings.restaurant_logo ? (
              <h1>
                Gizlilik Politikası
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {settings.restaurant_name || 'Restoran'}
              </h1>
            )}
          </Link>
          <Link
            to="/"
            className="text-primary hover:text-primary-dark font-medium transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
            Gizlilik Politikası
          </h1>
          <p className="text-lg text-gray-600 mb-12 text-center">
            {settings.restaurant_name || 'Restoranımız'}, sizin gizliliğinize değer verir. Bu
            politika, bilgilerinizin nasıl korunduğunu açıklar.
          </p>

          <div className="space-y-10 prose prose-lg max-w-none text-gray-700">
            {/* Bölüm 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Hangi Bilgileri Topluyoruz?
              </h2>
              <p>
                {settings.restaurant_name || 'Restoranımız'} olarak, sizlere en iyi hizmeti sunmak
                için bazı bilgiler topluyoruz:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Kişisel Bilgiler:</strong> Rezervasyon veya sipariş sırasında verdiğiniz ad,
                  e-posta adresi ve telefon numarası gibi bilgiler.
                </li>
                <li>
                  <strong>Kullanım Bilgileri:</strong> Web sitemizi nasıl kullandığınıza dair veriler
                  (örneğin, ziyaret ettiğiniz sayfalar, IP adresi, tarayıcı türü).
                </li>
                <li>
                  <strong>Çerezler:</strong> Web sitemizde daha iyi bir deneyim sunmak için çerezler
                  kullanıyoruz. Bunları tarayıcı ayarlarınızdan yönetebilirsiniz.
                </li>
              </ul>
            </section>

            {/* Bölüm 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Bilgilerinizi Nasıl Kullanıyoruz?
              </h2>
              <p>Bilgilerinizi şu amaçlarla kullanıyoruz:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Rezervasyonlarınızı ve siparişlerinizi işlemek.</li>
                <li>Sizlere özel teklifler ve promosyonlar sunmak.</li>
                <li>Web sitemizi ve hizmetlerimizi geliştirmek.</li>
                <li>Müşteri hizmetleri taleplerinize yanıt vermek.</li>
              </ul>
            </section>

            {/* Bölüm 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Bilgileriniz Güvende mi?
              </h2>
              <p>
                Bilgilerinizin güvenliği bizim için önemlidir. Kişisel verilerinizi korumak için
                endüstri standardı güvenlik önlemleri kullanıyoruz. Ancak, internet üzerinden veri
                aktarımının tamamen güvenli olmadığını unutmayın.
              </p>
              <p>
                Bilgilerinizi yalnızca yasal zorunluluklar veya hizmetlerimizi sunmak için gerekli
                durumlarda güvenilir iş ortaklarımızla paylaşırız.
              </p>
            </section>

            {/* Bölüm 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Haklarınız Nelerdir?
              </h2>
              <p>
                Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Bilgilerinize erişme ve bir kopyasını talep etme.</li>
                <li>Hatalı veya eksik bilgileri düzeltme.</li>
                <li>Bilgilerinizin silinmesini isteme.</li>
                <li>Veri işleme için verdiğiniz izni geri çekme.</li>
              </ul>
              <p>
                Bu haklarınızı kullanmak için lütfen bizimle{' '}
                <Link to="/contact" className="text-primary hover:underline">
                  iletişime geçin
                </Link>
                .
              </p>
            </section>

            {/* Bölüm 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Çerezler ve Takip Teknolojileri
              </h2>
              <p>
                Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler ve benzer teknolojiler
                kullanır. Çerezler, örneğin, tercihlerinizi hatırlamak veya site trafiğini analiz etmek
                için kullanılır. Çerez ayarlarınızı tarayıcınızdan düzenleyebilirsiniz.
              </p>
            </section>

            {/* Bölüm 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Bizimle İletişime Geçin</h2>
              <p>
                Gizlilik Politikamız hakkında sorularınız veya endişeleriniz varsa, bizimle iletişime
                geçmekten çekinmeyin:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>E-posta:</strong>{' '}
                  {settings.email ? (
                    <a href={`mailto:${settings.email}`} className="text-primary hover:underline">
                      {settings.email}
                    </a>
                  ) : (
                    'info@restoran.com'
                  )}
                </li>
                <li>
                  <strong>Telefon:</strong>{' '}
                  {settings.phone_number ? (
                    <a
                      href={`tel:${settings.phone_number.replace(/\s+/g, '')}`}
                      className="text-primary hover:underline"
                    >
                      {settings.phone_number}
                    </a>
                  ) : (
                    '+90 123 456 78 90'
                  )}
                </li>
                <li>
                  Daha fazla bilgi için{' '}
                  <Link to="/feedback" className="text-primary hover:underline">
                    iletişim sayfamızı
                  </Link>{' '}
                  ziyaret edin.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      
    </div>
  );
};

export default PrivacyPolicy;