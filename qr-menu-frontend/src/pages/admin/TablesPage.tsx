import type React from 'react';
import { useState, useEffect } from 'react';
import { tableService } from '../../services';
import type { ITable } from '../../types';

// Masa ekleme/düzenleme formu bileşeni
const TableForm = ({
  table,
  onSubmit,
  onCancel,
}: {
  table?: ITable;
  onSubmit: (tableData: Partial<ITable>) => void;
  onCancel: () => void;
}) => {
  const [tableNumber, setTableNumber] = useState(table?.table_number || '');
  const [isActive, setIsActive] = useState(table?.is_active !== false);
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved'>(
    table?.status || 'available'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Masa verilerini hazırla
    const tableData: Partial<ITable> = {
      table_number: tableNumber,
      is_active: isActive,
      status
    };

    console.log('Form verileri gönderiliyor:', tableData);

    // Form verilerini ana bileşene gönder
    onSubmit(tableData);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="tableNumber" className="mb-1 block font-medium text-gray-700">
            Masa Numarası <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="tableNumber"
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="status" className="mb-1 block font-medium text-gray-700">
            Durum
          </label>
          <select
            id="status"
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'available' | 'occupied' | 'reserved')}
          >
            <option value="available">Müsait</option>
            <option value="occupied">Dolu</option>
            <option value="reserved">Rezerve</option>
          </select>
        </div>

        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="isActive" className="ml-2 block text-gray-700">
            Aktif
          </label>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            İptal
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            {table ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

// QR Kod detay bileşeni
const QRCodeDetail = ({
  tableId,
  onClose
}: {
  tableId: number;
  onClose: () => void
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQrCode = async () => {
      try {
        setLoading(true);
        // Önce mevcut QR kodunu kontrol et
        let qrCode = await tableService.getQrCodeUrl(tableId);

        // Eğer yoksa yeni bir QR kodu oluştur
        if (!qrCode) {
          const result = await tableService.generateQrCode(tableId);
          qrCode = result?.qr_code_url || null;
        }

        setQrCodeUrl(qrCode);
        setError('');
      } catch (err) {
        console.error('QR kod alınırken hata oluştu:', err);
        setError('QR kod alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchQrCode();
  }, [tableId]);

  const generateNewQrCode = async () => {
    try {
      setLoading(true);
      const result = await tableService.generateQrCode(tableId);
      setQrCodeUrl(result?.qr_code_url || null);
      setError('');
    } catch (err) {
      console.error('QR kod oluşturulurken hata oluştu:', err);
      setError('QR kod oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeUrl) return;

    // Yeni bir link oluştur
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `Masa-QR-${tableId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Masa QR Kodu</h3>
                <div className="mt-4">
                  {loading ? (
                    <div className="text-center">
                      <p className="text-gray-500">QR Kod yükleniyor...</p>
                    </div>
                  ) : error ? (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    </div>
                  ) : qrCodeUrl ? (
                    <div className="flex flex-col items-center justify-center">
                      <img
                        src={qrCodeUrl}
                        alt="Masa QR Kodu"
                        className="h-64 w-64"
                      />
                      <div className="mt-4 flex space-x-2">
                        <button
                          type="button"
                          onClick={generateNewQrCode}
                          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                        >
                          Yeni QR Kod Oluştur
                        </button>
                        <button
                          type="button"
                          onClick={downloadQrCode}
                          className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                        >
                          QR Kodu İndir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500">QR Kod bulunamadı. Lütfen yeni bir QR kod oluşturun.</p>
                      <button
                        type="button"
                        onClick={generateNewQrCode}
                        className="mt-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                      >
                        QR Kod Oluştur
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TablesPage = () => {
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentTable, setCurrentTable] = useState<ITable | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Masaları yükle
  const fetchTables = async () => {
    try {
      setLoading(true);

      // Zaman damgası ekleyerek önbelleği atlayalım
      const timestamp = new Date().getTime();

      // Filtreleme parametrelerini hazırla
      const params: { status?: string; _t?: number } = {
        _t: timestamp, // Önbelleği atlamak için zaman damgası
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      console.log('Fetching tables from database with params:', params);
      const data = await tableService.getTables(params);
      console.log('Tables fetched from database:', data);

      if (Array.isArray(data)) {
        setTables(data);
        setError('');
      } else {
        console.error('Unexpected tables data format:', data);
        setTables([]);
        setError('Masalar yüklenirken veri formatı hatası oluştu.');
      }
    } catch (error) {
      console.error('Masalar yüklenirken hata oluştu:', error);
      setError('Masalar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [statusFilter]);

  // Masa oluştur veya güncelle
  const handleSubmit = async (tableData: Partial<ITable>) => {
    try {
      setLoading(true);
      console.log('Ana bileşen - Masa verilerini işleme:', tableData);
      let result;

      if (currentTable) {
        // Masa güncelleme - form verilerini mevcut masa verisiyle birleştir
        console.log(`Masa güncelleniyor: ID=${currentTable.id}`, tableData);
        result = await tableService.updateTable(currentTable.id, tableData);
        console.log('Masa güncelleme yanıtı:', result);

        if (result) {
          setSuccessMessage('Masa başarıyla güncellendi');
        } else {
          setError('Masa güncellenirken bir hata oluştu: API başarısız yanıt döndü');
        }
      } else {
        // Yeni masa oluşturma
        console.log('Yeni masa oluşturuluyor:', tableData);
        result = await tableService.createTable(tableData);
        console.log('Masa oluşturma yanıtı:', result);

        if (result) {
          setSuccessMessage('Masa başarıyla oluşturuldu');
        } else {
          setError('Masa oluşturulurken bir hata oluştu: API başarısız yanıt döndü');
        }
      }

      // Formu kapat ve masaları yeniden yükle
      setShowForm(false);
      setCurrentTable(undefined);
      await fetchTables();
    } catch (err) {
      console.error('Masa kaydedilirken hata oluştu:', err);
      setError(`Masa kaydedilirken bir hata oluştu: ${err || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Masa silme
  const handleDelete = async (id: number) => {
    if (window.confirm('Bu masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setLoading(true);
        const success = await tableService.deleteTable(id);
        if (success) {
          setSuccessMessage('Masa başarıyla silindi');
          await fetchTables();
        } else {
          setError('Masa silinirken bir hata oluştu');
        }
      } catch (err) {
        console.error('Masa silinirken hata oluştu:', err);
        setError('Masa silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Masa düzenleme formunu aç
  const handleEdit = (table: ITable) => {
    setCurrentTable(table);
    setShowForm(true);
    setSuccessMessage('');
  };

  // QR kod modalını aç
  const handleViewQRCode = (id: number) => {
    setSelectedTableId(id);
  };

  // Temizlenmiş mesajlar için
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Masalar</h1>
        {!showForm && (
          <button
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
            onClick={() => {
              setCurrentTable(undefined);
              setShowForm(true);
              setSuccessMessage('');
            }}
          >
            Yeni Masa
          </button>
        )}
      </div>

      {/* Başarı Mesajı */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Masa Formu */}
      {showForm ? (
        <TableForm
          table={currentTable}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setCurrentTable(undefined);
          }}
        />
      ) : (
        <>
          {/* Filtreleme */}
          <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-md sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="statusFilter" className="mb-1 block text-sm font-medium text-gray-700">
                Duruma Göre Filtrele
              </label>
              <select
                id="statusFilter"
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tüm Masalar</option>
                <option value="available">Müsait</option>
                <option value="occupied">Dolu</option>
                <option value="reserved">Rezerve</option>
              </select>
            </div>
          </div>

          {/* Masalar Tablosu */}
          {loading && <p className="text-center text-gray-500">Yükleniyor...</p>}

          {!loading && tables.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center shadow-md">
              <p className="text-gray-500">Henüz masa bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white shadow-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Masa Numarası
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Durum
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      QR Kod
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Aktif
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tables.map((table) => (
                    <tr key={table.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {table.table_number}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            table.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : table.status === 'occupied'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {table.status === 'available'
                            ? 'Müsait'
                            : table.status === 'occupied'
                            ? 'Dolu'
                            : 'Rezerve'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => handleViewQRCode(table.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          QR Kod Görüntüle
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            table.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {table.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(table)}
                          className="mr-2 text-primary hover:text-primary-dark"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(table.id)}
                          className="text-red-600 hover:text-red-900"
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
        </>
      )}

      {/* QR Kod Modal */}
      {selectedTableId && (
        <QRCodeDetail
          tableId={selectedTableId}
          onClose={() => setSelectedTableId(null)}
        />
      )}
    </div>
  );
};

export default TablesPage;
