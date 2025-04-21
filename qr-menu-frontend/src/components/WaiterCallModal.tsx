import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { waiterCallService } from '../services';
import apiService from '../services/api.service';
import type { ITable } from '../types';

interface WaiterCallModalProps {
  onClose: () => void;
}

const WaiterCallModal = ({ onClose }: WaiterCallModalProps) => {
  const [tableNumber, setTableNumber] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);

  // Masaları yükle - API doğrudan erişim ile
  useEffect(() => {
    const fetchTables = async () => {
      try {
        // tableService yerine doğrudan apiService kullanarak tabloları getir (kimlik doğrulaması gerektirmeden)
        const response = await apiService.get('/tables');
        console.log('Masa yanıtı:', response);

        if (response.success && response.data) {
          // Sadece aktif masaları filtrele
          const activeTables = response.data.filter((table: ITable) => table.is_active);
          setTables(activeTables);
        } else {
          console.log('Masa verisi bulunamadı veya yanıt formatı yanlış:', response);
          setTables([]);
        }
      } catch (error) {
        console.error('Masalar yüklenirken hata oluştu:', error);
        toast.error('Masalar yüklenemedi, lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  const handleTableSelect = (table: ITable) => {
    setSelectedTableId(table.id);
    setTableNumber(table.table_number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tableNumber) {
      toast.error('Lütfen masa numaranızı girin veya seçin');
      return;
    }

    setIsSubmitting(true);

    try {
      // Masa numarasıyla doğrudan garson çağır
      // Basitleştirilmiş yaklaşım - masa ID'si aramadan direkt masa numarasını kullan
      const result = await waiterCallService.createWaiterCall({
        table_id: selectedTableId || Number.parseInt(tableNumber) || 0
      });

      if (!result) {
        throw new Error('Garson çağrılamadı');
      }

      setCallSuccess(true);

      toast.success(
        <div>
          <p className="font-medium">Garson çağrıldı!</p>
          <p className="text-sm">En kısa sürede size yardımcı olacağız.</p>
        </div>
      );

      // 3 saniye sonra modal'ı kapat
      setTimeout(() => {
        setCallSuccess(false);
        setTableNumber('');
        setSelectedTableId(null);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Garson çağırma hatası:', error);
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {!callSuccess ? (
          <>
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={onClose}
              type="button"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-6 flex items-center">
              <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary">
                <svg
                  className="h-6 w-6"
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
              <h3 className="text-lg font-medium text-gray-800">Garson Çağır</h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="tableNumber" className="mb-2 block text-sm font-medium text-gray-700">
                  Masa Numaranız
                </label>
                <input
                  type="text"
                  id="tableNumber"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Örn: 5"
                  required
                />
              </div>

              <div className="mt-4">
                <label htmlFor="tableSelect" className="mb-2 block text-sm font-medium text-gray-700">
                  Mevcut Masalar
                </label>
                {loading ? (
                  <p>Yükleniyor...</p>
                ) : (
                  <select
                    id="tableSelect"
                    onChange={(e) => {
                      const selectedTable = tables.find(table => table.id === Number(e.target.value));
                      if (selectedTable) {
                        handleTableSelect(selectedTable);
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Masa Seçin</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.table_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mt-6 text-right">
                <button
                  type="button"
                  className="mr-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={onClose}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Garson Çağır'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-800">
              Garson çağrınız alındı!
            </h3>
            <p className="text-gray-600">
              En kısa sürede masanıza geleceğiz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterCallModal;
