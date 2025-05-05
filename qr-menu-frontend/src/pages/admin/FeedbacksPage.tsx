import { useState, useEffect } from 'react';
import { feedbackService, tableService } from '../../services';
import type { IFeedback, ITable } from '../../types';
import { toast } from 'react-hot-toast';

const FeedbacksPage = () => {
  const [feedbacks, setFeedbacks] = useState<IFeedback[]>([]);
  const [tables, setTables] = useState<Record<number, ITable>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<IFeedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Geri bildirimleri yükle
  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const allFeedbacks = await feedbackService.getFeedbacks();

      // En yeni geri bildirimler en üstte gösterilsin
      allFeedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFeedbacks(allFeedbacks);

      // Masa bilgilerini yükle
      await loadTables();
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      toast.error('Geri bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Masaları yükle
  const loadTables = async () => {
    try {
      const allTables = await tableService.getTables();
      const tablesMap: Record<number, ITable> = {};

      allTables.forEach(table => {
        tablesMap[table.id] = table;
      });

      setTables(tablesMap);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  // Geri bildirimi sil
  const deleteFeedback = async (id: number) => {
    if (!window.confirm('Bu geri bildirimi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await feedbackService.deleteFeedback(id);
      toast.success('Geri bildirim silindi');
      setFeedbacks(feedbacks.filter(f => f.id !== id));

      // Eğer detay modalı açıksa ve silinen feedback gösteriliyorsa, modalı kapat
      if (selectedFeedback?.id === id) {
        setIsDetailModalOpen(false);
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Geri bildirim silinirken bir hata oluştu.');
    }
  };

  // Detayları göster
  const showDetails = (feedback: IFeedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  // Sayfa yüklendiğinde
  useEffect(() => {
    loadFeedbacks();
  }, []);

  // Zaman formatla
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Puan gösterimi için yıldız oluştur
  const renderStars = (rating?: number) => {
    if (!rating) return 'Değerlendirilmemiş';

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            className={`h-4 w-4 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-xs sm:text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Müşteri Geri Bildirimleri</h1>
        <button
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          onClick={() => loadFeedbacks()}
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <svg
            className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p className="text-base sm:text-lg font-medium text-gray-900">Geri bildirim bulunamadı</p>
          <p className="mt-1 text-sm text-gray-500">
            Henüz hiç müşteri geri bildirimi alınmamış.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:overflow-hidden sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-md">
          {/* Mobil için kart düzeni */}
          <div className="sm:hidden flex flex-col gap-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{feedback.name}</div>
                      {feedback.email && (
                        <div className="text-xs text-gray-500">{feedback.email}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(feedback.created_at)}</div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Değerlendirme:</span> {renderStars(feedback.overall_rating)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Masa:</span>{' '}
                    {feedback.table_number
                      ? `Masa ${feedback.table_number}`
                      : feedback.table_id
                      ? `Masa ${tables[feedback.table_id]?.table_number || feedback.table_id}`
                      : 'Belirtilmemiş'}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className="flex-1 text-sm font-medium text-primary hover:text-primary-dark"
                      onClick={() => showDetails(feedback)}
                    >
                      Detaylar
                    </button>
                    <button
                      type="button"
                      className="flex-1 text-sm font-medium text-red-600 hover:text-red-800"
                      onClick={() => deleteFeedback(feedback.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Masaüstü için tablo düzeni */}
          <table className="hidden sm:table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Müşteri
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Değerlendirme
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Masa
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Tarih
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {feedbacks.map((feedback) => (
                <tr key={feedback.id}>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{feedback.name}</div>
                    {feedback.email && (
                      <div className="text-sm text-gray-500">{feedback.email}</div>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    {renderStars(feedback.overall_rating)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {feedback.table_number
                      ? `Masa ${feedback.table_number}`
                      : feedback.table_id
                      ? `Masa ${tables[feedback.table_id]?.table_number || feedback.table_id}`
                      : 'Belirtilmemiş'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {formatDate(feedback.created_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-sm">
                    <button
                      type="button"
                      className="font-medium text-primary hover:text-primary-dark"
                      onClick={() => showDetails(feedback)}
                    >
                      Detaylar
                    </button>
                    <button
                      type="button"
                      className="ml-4 font-medium text-red-600 hover:text-red-800"
                      onClick={() => deleteFeedback(feedback.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detay Modalı */}
      {isDetailModalOpen && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black bg-opacity-50">
          <div className="relative w-full max-w-md sm:max-w-2xl rounded-lg bg-white p-4 sm:p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-3 sm:right-4 top-3 sm:top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setIsDetailModalOpen(false)}
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="mb-4 text-base sm:text-lg font-medium text-gray-900">
              Geri Bildirim Detayları
            </h3>

            <div className="mb-4 sm:mb-6 border-b border-gray-200 pb-4 sm:pb-5">
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs sm:text-sm font-medium text-gray-500">Müşteri:</div>
                <div className="text-xs sm:text-sm font-medium text-gray-900">{selectedFeedback.name}</div>
              </div>

              {selectedFeedback.email && (
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs sm:text-sm font-medium text-gray-500">E-posta:</div>
                  <div className="text-xs sm:text-sm text-gray-900">{selectedFeedback.email}</div>
                </div>
              )}

              <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs sm:text-sm font-medium text-gray-500">Masa:</div>
                <div className="text-xs sm:text-sm text-gray-900">
                  {selectedFeedback.table_number
                    ? `Masa ${selectedFeedback.table_number}`
                    : selectedFeedback.table_id
                    ? `Masa ${tables[selectedFeedback.table_id]?.table_number || selectedFeedback.table_id}`
                    : 'Belirtilmemiş'}
                </div>
              </div>

              <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs sm:text-sm font-medium text-gray-500">Tarih:</div>
                <div className="text-xs sm:text-sm text-gray-900">{formatDate(selectedFeedback.created_at)}</div>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <h4 className="mb-2 sm:mb-3 text-sm font-medium text-gray-900">Değerlendirmeler</h4>

              <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500">Genel:</div>
                  <div className="mt-1">{renderStars(selectedFeedback.overall_rating)}</div>
                </div>

                {selectedFeedback.food_rating !== undefined && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-500">Yemek:</div>
                    <div className="mt-1">{renderStars(selectedFeedback.food_rating)}</div>
                  </div>
                )}

                {selectedFeedback.service_rating !== undefined && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-500">Servis:</div>
                    <div className="mt-1">{renderStars(selectedFeedback.service_rating)}</div>
                  </div>
                )}

                {selectedFeedback.ambience_rating !== undefined && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-500">Ambiyans:</div>
                    <div className="mt-1">{renderStars(selectedFeedback.ambience_rating)}</div>
                  </div>
                )}

                {selectedFeedback.price_rating !== undefined && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-500">Fiyat-Performans:</div>
                    <div className="mt-1">{renderStars(selectedFeedback.price_rating)}</div>
                  </div>
                )}
              </div>
            </div>

            {selectedFeedback.comments && (
              <div className="mb-4 sm:mb-6">
                <h4 className="mb-2 text-sm font-medium text-gray-900">Yorumlar</h4>
                <div className="rounded-md bg-gray-50 p-2 sm:p-3 text-xs sm:text-sm text-gray-700">
                  {selectedFeedback.comments}
                </div>
              </div>
            )}

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-red-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-700 hover:bg-red-200"
                onClick={() => {
                  deleteFeedback(selectedFeedback.id);
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbacksPage;