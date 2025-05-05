import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { settingsService } from '../services';
import DOMPurify from 'dompurify';
import type { Banner, SiteSettings } from '../services/settings.service';

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});

  // Load settings and banners
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // Get settings - tüm ayarların veritabanından gelmesini sağla
        const siteSettings = await settingsService.getSettings();
        setSettings(siteSettings);

        // Get banners - tüm banner'ların veritabanından gelmesini sağla
        const bannersData = await settingsService.getBanners(true);
        setBanners(bannersData);

      } catch (error) {
        console.error('Error loading home page data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Banner rotation only if banners exist
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners]);

  // Previous slide handler
  const prevSlide = () => {
    if (banners.length <= 1) return;
    setCurrentSlide((prev) =>
      prev === 0 ? banners.length - 1 : prev - 1
    );
  };

  // Next slide handler
  const nextSlide = () => {
    if (banners.length <= 1) return;
    setCurrentSlide((prev) =>
      (prev + 1) % banners.length
    );
  };
  const getIframeSrc = (html: string) => {
    if (!html) return '';
    const srcMatch = html.match(/src="([^"]+)"/);
    return srcMatch ? srcMatch[1] : '';
  };
  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Banner / Slider Bölümü - Sadece banner varsa göster */}
      {banners.length > 0 && (
        <div className="relative h-[50vh] w-full overflow-hidden md:h-[60vh]">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${banner.image_url})`,
                  backgroundSize: 'cover'
                }}
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}

          {/* Slider okları - birden fazla banner varsa */}
          {banners.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/30 p-2 text-white backdrop-blur-sm transition hover:bg-white/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/30 p-2 text-white backdrop-blur-sm transition hover:bg-white/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}

          {/* Slider İçeriği - Başlık, Alt Başlık ve Buton */}
          {banners[currentSlide] && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
              {banners[currentSlide].title && (
                <h1 className="mb-2 text-4xl font-bold md:text-6xl">{banners[currentSlide].title}</h1>
              )}

              {banners[currentSlide].subtitle && (
                <p className="mb-6 text-xl italic md:text-2xl">{banners[currentSlide].subtitle}</p>
              )}

              {banners[currentSlide].button_text && (
                <Link
                  to={banners[currentSlide].button_link || '/menu'}
                  className="rounded-full bg-primary px-8 py-3 font-medium text-white transition-all hover:bg-primary-dark hover:shadow-lg"
                >
                  {banners[currentSlide].button_text}
                </Link>
              )}
            </div>
          )}

          {/* Slider göstergeleri - birden fazla banner varsa */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 w-8 rounded-full transition-all ${
                    index === currentSlide ? 'bg-primary' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bannerlar yüklenmediğinde veya boş ise bilgi mesajı göster */}
      {!loading && banners.length === 0 && (
        <div className="flex h-[30vh] items-center justify-center">
          <p className="text-xl text-gray-500">Henüz banner eklenmemiş.</p>
        </div>
      )}

      {/* Restoran Hakkında Bilgi - Eğer ayarlar varsa */}
      {(settings.restaurant_name || settings.restaurant_description) && (
        <div className="container mx-auto py-16">
          <div className="mx-auto max-w-3xl text-center">
            {settings.restaurant_name && (
              <>
                <h2 className="mb-6 text-3xl font-bold text-gray-800 md:text-4xl">
                  {settings.restaurant_name}
                </h2>
                <div className="mx-auto mb-8 h-1 w-24 bg-primary" />
              </>
            )}

            {settings.restaurant_slogan && (
              <p className="mb-4 text-xl font-medium text-gray-700">{settings.restaurant_slogan}</p>
            )}

            {settings.restaurant_description && (
              <p className="mb-8 text-lg leading-relaxed text-gray-600">
                {settings.restaurant_description}
              </p>
            )}

            {/* İletişim bilgileri */}
            <div className="flex flex-col items-center justify-center space-y-4 md:flex-row md:space-x-4 md:space-y-0">
              {settings.phone_number && (
                <span className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 inline h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  {settings.phone_number}
                </span>
              )}

              {settings.address && (
                <span className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 inline h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {settings.address}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ayarlar yüklenmediğinde veya boş ise bilgi mesajı göster */}
      {!loading && !settings.restaurant_name && !settings.restaurant_description && (
        <div className="flex h-[30vh] items-center justify-center">
          <p className="text-xl text-gray-500">Restoran bilgileri henüz eklenmemiş.</p>
        </div>
      )}

      {/* Özellikler Bölümü - Her zaman göster */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-800 md:text-4xl">
            Hizmetlerimiz
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-8 text-center shadow-md transition-transform hover:scale-105">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-bold text-gray-800">
                QR Kod İle Sipariş
              </h3>
              <p className="text-gray-600">
                QR kodu taratın, menümüzü görüntüleyin ve siparişinizi kolayca verin.
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-8 text-center shadow-md transition-transform hover:scale-105">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-bold text-gray-800">
                Garson Çağırma
              </h3>
              <p className="text-gray-600">
                İhtiyacınız olduğunda tek tıkla garson çağırabilirsiniz.
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-8 text-center shadow-md transition-transform hover:scale-105">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-bold text-gray-800">
                Geri Bildirim
              </h3>
              <p className="text-gray-600">
                Deneyiminiz hakkında geri bildirimde bulunarak bize yardımcı olun.
              </p>
            </div>
          </div>
        </div>
      </div>
        {/* Google Maps Bölümü */}
        {settings.googleMap ? (
        <div>
          {/* Iframe yaklaşımı */}
          {getIframeSrc(settings.googleMap) ? (
            <iframe
              src={getIframeSrc(settings.googleMap)}
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              className="rounded-lg"
            />
          ) : (
            <div
              className="w-full h-[450px] rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(settings.googleMap) }}
            />
          )}
      
        </div>
      ) : (
        <div className="container mx-auto py-16 text-center">
          <p className="text-xl text-gray-500">Google Maps verisi bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
