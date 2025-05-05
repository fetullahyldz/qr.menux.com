import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { feedbackService } from '../services';
import type { IFeedback } from '../types';

interface RatingItem {
  id: string;
  label: string;
  value: number;
}

const FeedbackPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ratings, setRatings] = useState<RatingItem[]>([
    { id: 'food', label: 'Menü', value: 0 },
    { id: 'price', label: 'Fiyat', value: 0 },
    { id: 'service', label: 'Servis', value: 0 },
    { id: 'ambience', label: 'Ortam', value: 0 },
    { id: 'overall', label: 'Genel Değerlendirme', value: 0 },
  ]);

  const handleRatingChange = (id: string, value: number) => {
    setRatings(ratings.map((rating) => (rating.id === id ? { ...rating, value } : rating)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Tüm değerlendirmeler doldurulmuş mu kontrol et
    if (ratings.some((r) => r.value === 0)) {
      toast.error('Lütfen tüm değerlendirme alanlarını doldurun.');
      return;
    }

    // Masa numarası boş mu kontrol et
    if (!tableNumber.trim()) {
      toast.error('Lütfen masa numarasını girin.');
      return;
    }

    // Masa numarasını doğrula (örneğin, sadece "M-" ile başlayanlara izin ver)
    if (!/^M-\d+$/.test(tableNumber)) {
      toast.error('Geçerli bir masa numarası girin (örneğin, M-1, M-3, M-7).');
      return;
    }

    // table_id türet
    let tableId: number | undefined;
    const matches = tableNumber.match(/\d+/g);
    if (matches && matches.length > 0) {
      tableId = Number.parseInt(matches[0], 10);
    } else {
      toast.error('Masa numarasından ID türetilemedi. Lütfen geçerli bir masa numarası girin.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Değerlendirmeleri al
      const foodRating = ratings.find((r) => r.id === 'food')?.value || 0;
      const priceRating = ratings.find((r) => r.id === 'price')?.value || 0;
      const serviceRating = ratings.find((r) => r.id === 'service')?.value || 0;
      const ambienceRating = ratings.find((r) => r.id === 'ambience')?.value || 0;
      const overallRating = ratings.find((r) => r.id === 'overall')?.value || 0;

      // Geri bildirim verisi (hem table_id hem table_number gönderiliyor)
      const feedbackData: Partial<IFeedback> = {
        name,
        email: email || undefined,
        table_id: tableId,
        table_number: tableNumber,
        food_rating: foodRating,
        price_rating: priceRating,
        service_rating: serviceRating,
        ambience_rating: ambienceRating,
        overall_rating: overallRating,
        comments: comments || undefined,
      };

      console.log('Sending feedback data:', feedbackData);
      const result = await feedbackService.createFeedback(feedbackData);

      if (!result) {
        throw new Error('Geri bildirim gönderilemedi: Sunucu yanıtı boş.');
      }

      toast.success('Geri bildiriminiz için teşekkürler!');
      setIsSubmitted(true);

      // Formu sıfırla
      setTimeout(() => {
        setName('');
        setEmail('');
        setComments('');
        setTableNumber('');
        setRatings(ratings.map((rating) => ({ ...rating, value: 0 })));
        setIsSubmitted(false);
      }, 3000);
    } catch (error: any) {
      console.error('Geri bildirim gönderme hatası:', error.message, error.stack);
      if (error.response?.status === 404) {
        toast.error('Masa numarası sistemde kayıtlı değil. Lütfen geçerli bir masa numarası girin (örneğin, M-1, M-2, M-3).');
      } else if (error.response?.status === 400) {
        toast.error('Geçersiz masa numarası. Lütfen geçerli bir masa numarası girin (örneğin, M-1, M-2, M-3).');
      } else {
        toast.error(`Geri bildirim gönderilirken bir hata oluştu: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Yıldız derecelendirme bileşeni
  const StarRating = ({ id, value, onChange }: { id: string; value: number; onChange: (value: number) => void }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" className="p-1" onClick={() => onChange(star)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${star <= value ? 'text-yellow-500' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 md:text-3xl">Geri Bildirim</h1>
        <p>Not: Geri bildirimler yalnızca restoran içerisinden alınmaktadır.</p>
        {isSubmitted ? (
          <div className="rounded-lg bg-green-50 p-6 text-center shadow-md">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Geri bildiriminiz için teşekkürler!</h2>
            <p className="text-gray-600">Değerli geri bildiriminiz hizmetlerimizi geliştirmemize yardımcı olacak.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4">
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                id="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="tableNumber" className="mb-2 block text-sm font-medium text-gray-700">
                Masa Numarası *
              </label>
              <input
                type="text"
                id="tableNumber"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
                placeholder="Ör: M-1, M-2, M-3"
              />
            </div>

            <div className="mb-6">
              <h3 className="mb-4 text-lg font-medium text-gray-800">Deneyiminizi değerlendirin *</h3>
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="flex items-center justify-between">
                    <span className="text-gray-700">{rating.label}</span>
                    <div>
                      <StarRating
                        id={rating.id}
                        value={rating.value}
                        onChange={(value) => handleRatingChange(rating.id, value)}
                      />
                      {rating.value === 0 && (
                        <p className="text-red-500 text-sm mt-1">Lütfen bu alanı değerlendirin</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="comments" className="mb-2 block text-sm font-medium text-gray-700">
                Yorumlarınız
              </label>
              <textarea
                id="comments"
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className="text-right">
              <button
                type="submit"
                className="rounded-md bg-primary px-6 py-2 text-white hover:bg-primary-dark disabled:bg-gray-400"
                disabled={!name || !tableNumber || ratings.some((r) => r.value === 0) || isSubmitting}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;