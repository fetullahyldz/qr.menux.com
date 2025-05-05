import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Kullanım Koşulları</h1>
      <div className="prose max-w-none text-gray-700">
        <p>
          [Restoran Adı] web sitesini kullanarak aşağıdaki Kullanım Koşulları'nı kabul etmiş
          olursunuz. Lütfen bu koşulları dikkatlice okuyun.
        </p>

        <h2>1. Genel Hükümler</h2>
        <p>
          Bu web sitesi, [Restoran Adı] tarafından işletilmektedir. Web sitemizi kullanarak sunduğumuz
          hizmetlerden yararlanabilirsiniz.
        </p>

        <h2>2. Kullanım Şartları</h2>
        <p>Web sitemizi kullanırken aşağıdaki kurallara uymalısınız:</p>
        <ul>
          <li>Yanlış veya yanıltıcı bilgi sağlamamalısınız.</li>
          <li>Web sitemizi yasa dışı amaçlarla kullanmamalısınız.</li>
          <li>Diğer kullanıcıların deneyimini olumsuz etkileyecek davranışlardan kaçınmalısınız.</li>
        </ul>

        <h2>3. Hizmetler</h2>
        <p>
          Web sitemiz üzerinden rezervasyon yapma, menü görüntüleme ve sipariş verme gibi hizmetler
          sunuyoruz. Bu hizmetlerin kullanılabilirliği değişebilir.
        </p>

        <h2>4. Sorumluluk Sınırlamaları</h2>
        <p>
          Web sitemizdeki bilgilerin doğruluğunu sağlamak için çaba gösteriyoruz, ancak hatalardan
          sorumlu değiliz. Hizmetlerimiz "olduğu gibi" sunulur.
        </p>

        <h2>5. İletişim</h2>
        <p>
          Kullanım Koşullarıyla ilgili sorularınız için bizimle{' '}
          <Link to="/feedback" className="text-primary hover:underline">
            iletişime geçebilirsiniz
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default TermsOfService;