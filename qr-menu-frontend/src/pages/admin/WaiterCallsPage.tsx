import { useState, useEffect } from 'react';
import { waiterCallService, tableService } from '../../services';
import type { IWaiterCall, ITable } from '../../types';
import { toast } from 'react-hot-toast';

const WaiterCallsPage = () => {
  const [waiterCalls, setWaiterCalls] = useState<IWaiterCall[]>([]);
  const [tables, setTables] = useState<Record<number, ITable>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // Garson çağrılarını yükle
  const loadWaiterCalls = async () => {
    setLoading(true);
    try {
      let calls: IWaiterCall[] = [];

      if (filter === 'all') {
        calls = await waiterCallService.getWaiterCalls();
      } else {
        calls = await waiterCallService.getWaiterCalls({ status: filter });
      }

      // En yeni çağrılar en üstte gösterilsin
      calls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setWaiterCalls(calls);

      // Masa bilgilerini yükle
      await loadTables();
    } catch (error) {
      console.error('Error loading waiter calls:', error);
      toast.error('Garson çağrıları yüklenirken bir hata oluştu.');
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

  // Durumu güncelle
  const updateStatus = async (id: number, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await waiterCallService.updateWaiterCallStatus(id, status);
      toast.success('Garson çağrısı durumu güncellendi');
      loadWaiterCalls();
    } catch (error) {
      console.error('Error updating waiter call status:', error);
      toast.error('Durum güncellenirken bir hata oluştu.');
    }
  };

  // Çağrıyı sil
  const deleteCall = async (id: number) => {
    if (!window.confirm('Bu garson çağrısını silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await waiterCallService.deleteWaiterCall(id);
      toast.success('Garson çağrısı silindi');
      loadWaiterCalls();
    } catch (error) {
      console.error('Error deleting waiter call:', error);
      toast.error('Garson çağrısı silinirken bir hata oluştu.');
    }
  };

  // Sayfa yüklendiğinde
  useEffect(() => {
    loadWaiterCalls();
  }, [filter]);

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

  // Duruma göre renk belirle
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Durumu Türkçe olarak göster
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'in_progress':
        return 'İşlemde';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Garson Çağrıları</h1>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <span className="text-sm font-medium text-gray-700 sm:self-center">Filtrele:</span>
          <div className="flex flex-wrap gap-2 sm:inline-flex sm:rounded-md sm:shadow-sm">
            <button
              type="button"
              className={`flex-1 sm:flex-none inline-flex items-center rounded-l-md sm:rounded-l-md px-3 py-2 text-sm font-medium ${
                filter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setFilter('all')}
            >
              Tümü
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none inline-flex items-center px-3 py-2 text-sm font-medium ${
                filter === 'pending' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setFilter('pending')}
            >
              Bekleyenler
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none inline-flex items-center px-3 py-2 text-sm font-medium ${
                filter === 'in_progress' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setFilter('in_progress')}
            >
              İşlemdekiler
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none inline-flex items-center rounded-r-md sm:rounded-r-md px-3 py-2 text-sm font-medium ${
                filter === 'completed' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setFilter('completed')}
            >
              Tamamlananlar
            </button>
          </div>

          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            onClick={() => loadWaiterCalls()}
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
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : waiterCalls.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <svg
            className="mb-3 h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
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
          <p className="text-base sm:text-lg font-medium text-gray-900">Garson çağrısı bulunamadı</p>
          <p className="mt-1 text-sm text-gray-500">
            Seçili filtreye göre gösterilecek garson çağrısı yok.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:overflow-hidden sm:rounded-lg sm:border sm:border-gray-200 sm:shadow">
          {/* Mobil için kart düzeni */}
          <div className="sm:hidden flex flex-col gap-4">
            {waiterCalls.map((call) => (
              <div key={call.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Masa {call.table_number || tables[call.table_id]?.table_number || call.table_id}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(call.status)}`}
                    >
                      {getStatusText(call.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Tarih: </span>{formatDate(call.created_at)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {call.status === 'pending' && (
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-500 hover:bg-blue-100"
                        onClick={() => updateStatus(call.id, 'in_progress')}
                      >
                        İşleme Al
                      </button>
                    )}
                    {(call.status === 'pending' || call.status === 'in_progress') && (
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center items-center rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-500 hover:bg-green-100"
                        onClick={() => updateStatus(call.id, 'completed')}
                      >
                        Tamamla
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center items-center rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-100"
                      onClick={() => deleteCall(call.id)}
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
                  Masa
                </th>
                <th
                  scope="col"
                  className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Durum
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
              {waiterCalls.map((call) => (
                <tr key={call.id}>
                  <td className="whitespace-nowrap px-4 sm:px-6 py-4">
                    <div className="text-sm text-gray-900">
                      Masa {call.table_number || tables[call.table_id]?.table_number || call.table_id}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 sm:px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(call.status)}`}
                    >
                      {getStatusText(call.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                    {formatDate(call.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-right text-sm">
                    <div className="inline-flex items-center rounded-md shadow-sm">
                      {call.status === 'pending' && (
                        <button
                          type="button"
                          className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-blue-500 hover:bg-blue-50"
                          onClick={() => updateStatus(call.id, 'in_progress')}
                        >
                          İşleme Al
                        </button>
                      )}
                      {(call.status === 'pending' || call.status === 'in_progress') && (
                        <button
                          type="button"
                          className={`inline-flex items-center border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-green-500 hover:bg-green-50 ${
                            call.status === 'pending' ? '' : 'rounded-l-md'
                          }`}
                          onClick={() => updateStatus(call.id, 'completed')}
                        >
                          Tamamla
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
                        onClick={() => deleteCall(call.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WaiterCallsPage;