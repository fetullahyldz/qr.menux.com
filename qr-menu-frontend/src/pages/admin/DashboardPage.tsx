import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
// Import services from the index to ensure consistent imports
import {
  statisticsService,
  orderService,
  waiterCallService
} from '../../services';
import type { IOrder, IWaiterCall } from '../../types';

// İstatistik kartı bileşeni
const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
  <div className="rounded-lg bg-white p-6 shadow-md">
    <div className="flex items-center">
      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

// Sipariş tablosu bileşeni
const OrdersTable = ({
  orders,
  onViewDetails,
  onUpdateStatus
}: {
  orders: IOrder[];
  onViewDetails: (orderId: number) => void;
  onUpdateStatus: (orderId: number, status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled') => void;
}) => (
  <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Son Siparişler</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sipariş ID</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Masa</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tutar</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Durum</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tarih</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">#{order.id}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{order.table_number}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                  {(() => {
                    // Sayı kontrolü ve güvenli dönüşüm
                    let amount = 0;
                    if (typeof order.total_amount === 'number') {
                      amount = order.total_amount;
                    } else if (order.total_amount) {
                      const parsed = Number.parseFloat(order.total_amount);
                      if (!isNaN(parsed)) {
                        amount = parsed;
                      }
                    }
                    return `${amount.toFixed(2)} ₺`;
                  })()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'processing'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : order.status === 'ready'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status === 'new'
                      ? 'Yeni'
                      : order.status === 'processing'
                      ? 'Hazırlanıyor'
                      : order.status === 'ready'
                      ? 'Hazır'
                      : order.status === 'completed'
                      ? 'Tamamlandı'
                      : 'İptal Edildi'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                  {new Date(order.created_at).toLocaleString('tr-TR')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    className="mr-2 text-indigo-600 hover:text-indigo-900"
                    onClick={() => onViewDetails(order.id)}
                  >
                    Detay
                  </button>
                  {order.status === 'new' && (
                    <button
                      className="mr-2 text-yellow-600 hover:text-yellow-900"
                      onClick={() => onUpdateStatus(order.id, 'processing')}
                    >
                      Hazırla
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      className="mr-2 text-purple-600 hover:text-purple-900"
                      onClick={() => onUpdateStatus(order.id, 'ready')}
                    >
                      Hazır
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      className="mr-2 text-green-600 hover:text-green-900"
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                    >
                      Tamamla
                    </button>
                  )}
                  {(order.status === 'new' || order.status === 'processing' || order.status === 'ready') && (
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    >
                      İptal
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                Henüz sipariş bulunmuyor
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Garson çağrıları bileşeni
const WaiterCallsTable = ({
  waiterCalls,
  onUpdateStatus
}: {
  waiterCalls: IWaiterCall[];
  onUpdateStatus: (callId: number, status: 'pending' | 'in_progress' | 'completed') => void;
}) => (
  <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-md">
    <div className="p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Garson Çağrıları</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Masa</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Durum</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tarih</th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {waiterCalls.length > 0 ? (
            waiterCalls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">#{call.id}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">{call.table_number}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      call.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : call.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {call.status === 'pending'
                      ? 'Bekliyor'
                      : call.status === 'in_progress'
                      ? 'İşlemde'
                      : 'Tamamlandı'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                  {new Date(call.created_at).toLocaleString('tr-TR')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {call.status === 'pending' && (
                    <button
                      className="mr-2 text-blue-600 hover:text-blue-900"
                      onClick={() => onUpdateStatus(call.id, 'in_progress')}
                    >
                      Başla
                    </button>
                  )}
                  {call.status === 'in_progress' && (
                    <button
                      className="mr-2 text-green-600 hover:text-green-900"
                      onClick={() => onUpdateStatus(call.id, 'completed')}
                    >
                      Tamamla
                    </button>
                  )}
                  {call.status !== 'completed' && (
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => onUpdateStatus(call.id, 'completed')}
                    >
                      İptal
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                Aktif garson çağrısı bulunmuyor
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const DashboardPage = () => {
  // State tanımlamaları
  const [stats, setStats] = useState({
    totalOrders: 0,
    todaySales: 0,
    activeWaiterCalls: 0,
    activeTables: 0
  });

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<IWaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // API'den verileri al
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Dashboard istatistikleri
      const dashboardStats = await statisticsService.getDashboardStats();

      // İstatistikler başarıyla alındıysa güncelleme yap
      if (dashboardStats) {
        setStats(dashboardStats);
      } else {
        // İstatistikler gelmezse manuel hesapla
        // Son siparişleri çek
        const recentOrders = await orderService.getOrders();
        const pendingOrders = recentOrders.filter(o => o.status === 'new' || o.status === 'processing' || o.status === 'ready').length;

        // Günlük gelir hesapla
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = recentOrders.filter(o =>
          new Date(o.created_at).toISOString().split('T')[0] === today
        );
        const todaySales = todayOrders.reduce((total, order) => {
          // Güvenli toplama için değeri sayıya dönüştür
          let amount = 0;
          if (typeof order.total_amount === 'number') {
            amount = order.total_amount;
          } else if (order.total_amount) {
            const parsed = Number.parseFloat(order.total_amount);
            if (!isNaN(parsed)) {
              amount = parsed;
            }
          }
          return total + amount;
        }, 0);

        // Aktif garson çağrıları
        const activeCallsCount = await waiterCallService.getActiveWaiterCallsCount();

        setStats({
          totalOrders: recentOrders.length,
          todaySales: todaySales,
          activeWaiterCalls: activeCallsCount,
          activeTables: 5 // Örnek değer
        });
      }

      // Son 5 siparişi çek
      try {
        // getRecentOrders may throw if not implemented, fallback to getOrders + sort
        let recentOrders: IOrder[] = [];
        if (orderService.getRecentOrders) {
          recentOrders = await orderService.getRecentOrders(5);
        } else {
          const allOrders = await orderService.getOrders();
          const sorted = [...allOrders].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          recentOrders = sorted.slice(0, 5);
        }
        setOrders(recentOrders);
      } catch (orderError) {
        console.error('Error fetching recent orders:', orderError);
        // Son siparişler gelmezse normale devam et
        const allOrders = await orderService.getOrders();
        const sorted = [...allOrders].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(sorted.slice(0, 5));
      }

      // Aktif garson çağrılarını çek
      try {
        const activeWaiterCalls = await waiterCallService.getWaiterCalls({
          status: 'pending'
        });
        const inProgressWaiterCalls = await waiterCallService.getWaiterCalls({
          status: 'in_progress'
        });
        setWaiterCalls([...activeWaiterCalls, ...inProgressWaiterCalls]);
      } catch (waiterError) {
        console.error('Error fetching waiter calls:', waiterError);
      }
    } catch (error) {
      console.error('Dashboard veri çekme hatası:', error);
      toast.error('Dashboard verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Sipariş ayrıntılarını görüntüle
  const handleViewOrderDetails = async (orderId: number) => {
    // Önce API'den sipariş detaylarını çekelim
    try {
      const orderDetail = await orderService.getOrderById(orderId);
      if (!orderDetail) {
        toast.error('Sipariş detayları bulunamadı');
        return;
      }

      // Seçilen siparişin derin bir kopyasını oluştur
      const orderWithSafeItems = { ...orderDetail };

      // Sipariş öğelerini ve seçenekleri kontrol et
      if (!orderWithSafeItems.items || !Array.isArray(orderWithSafeItems.items)) {
        // items yoksa API'den sipariş öğelerini almayı deneyelim
        try {
          console.log('Sipariş öğeleri yükleniyor...');
          const orderItems = await orderService.getOrderItems(orderId);
          if (orderItems && orderItems.length > 0) {
            orderWithSafeItems.items = orderItems;
            console.log('Sipariş öğeleri yüklendi:', orderItems);
          } else {
            // Öğeleri bulamazsak boş bir dizi oluştur
            orderWithSafeItems.items = [];
            console.log('Sipariş öğeleri bulunamadı, boş dizi oluşturuldu');
          }
        } catch (itemsError) {
          console.error('Sipariş öğeleri yüklenirken hata:', itemsError);
          orderWithSafeItems.items = [];
        }
      } else if (orderWithSafeItems.items.length > 0) {
        // Items varsa her bir öğe için güvenlik kontrolleri yap
        orderWithSafeItems.items = orderWithSafeItems.items.map(item => {
          // Derin kopya oluştur
          const safeItem = { ...item };

          // Ürün adını düzelt eğer eksikse
          if (!safeItem.product_name || safeItem.product_name.trim() === '') {
            safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
          }

          // Notes alanını oluştur (special_instructions)
          if (!safeItem.special_instructions && safeItem.special_instructions) {
            safeItem.special_instructions = safeItem.special_instructions;
          }

          // Seçenekleri kontrol et
          if (!safeItem.options) {
            safeItem.options = [];
          } else if (Array.isArray(safeItem.options)) {
            // Her seçenek için adlarını kontrol et
            safeItem.options = safeItem.options.map(option => {
              const safeOption = { ...option };
              if (!safeOption.product_option_name && safeOption.product_option_name) {
                safeOption.product_option_name = safeOption.product_option_name;
              } else if (!safeOption.product_option_name) {
                safeOption.product_option_name = `Seçenek #${safeOption.product_option_id || safeOption.id || 'Bilinmeyen'}`;
              }
              return safeOption;
            });
          }

          return safeItem;
        });
      }

      // Güvenli verilerle modal'ı aç
      setCurrentOrder(orderWithSafeItems);
      setShowOrderModal(true);

    } catch (error) {
      console.error('Sipariş detayları alınırken hata:', error);
      toast.error('Sipariş detayları yüklenemedi');
    }
  };

  // Sipariş durumunu güncelle
  const handleUpdateOrderStatus = async (orderId: number, status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled') => {
    try {
      await orderService.updateOrderStatus(orderId, status);

      // Siparişleri yeniden yükle
      let recentOrders: IOrder[] = [];
      if (orderService.getRecentOrders) {
        recentOrders = await orderService.getRecentOrders(5);
      } else {
        const allOrders = await orderService.getOrders();
        const sorted = [...allOrders].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        recentOrders = sorted.slice(0, 5);
      }
      setOrders(recentOrders);

      // İstatistikleri güncelle
      fetchDashboardData();

      toast.success(`Sipariş durumu başarıyla güncellendi`);
    } catch (error) {
      console.error('Sipariş durumu güncelleme hatası:', error);
      toast.error('Sipariş durumu güncellenirken bir hata oluştu');
    }
  };

  // Garson çağrısı durumunu güncelle
  const handleUpdateWaiterCallStatus = async (callId: number, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await waiterCallService.updateWaiterCallStatus(callId, status);

      // Aktif çağrıları yeniden yükle
      if (status === 'completed') {
        // Tamamlanan çağrıları listeden kaldır
        setWaiterCalls(waiterCalls.filter(call => call.id !== callId));
      } else {
        // Güncellenen çağrının durumunu güncelle
        setWaiterCalls(waiterCalls.map(call =>
          call.id === callId ? { ...call, status } : call
        ));
      }

      // İstatistikleri güncelle
      const activeCallsCount = await waiterCallService.getActiveWaiterCallsCount();
      setStats({
        ...stats,
        activeWaiterCalls: activeCallsCount
      });

      toast.success(`Garson çağrısı durumu başarıyla güncellendi`);
    } catch (error) {
      console.error('Garson çağrısı durumu güncelleme hatası:', error);
      toast.error('Garson çağrısı durumu güncellenirken bir hata oluştu');
    }
  };

  // Sipariş modalını kapat
  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setCurrentOrder(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Yönetim Paneli</h1>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Sipariş"
          value={stats.totalOrders}
          icon={<span className="text-xl">📊</span>}
        />
        <StatCard
          title="Bugünkü Kazanç"
          value={(() => {
            // Güvenli formatlamak için
            let amount = 0;
            if (typeof stats.todaySales === 'number') {
              amount = stats.todaySales;
            } else if (stats.todaySales) {
              const parsed = Number.parseFloat(stats.todaySales);
              if (!isNaN(parsed)) {
                amount = parsed;
              }
            }
            return `${amount.toFixed(2)} ₺`;
          })()}
          icon={<span className="text-xl">💰</span>}
        />
        <StatCard
          title="Aktif Garson Çağrısı"
          value={stats.activeWaiterCalls}
          icon={<span className="text-xl">🔔</span>}
        />
        <StatCard
          title="Aktif Masalar"
          value={stats.activeTables}
          icon={<span className="text-xl">🍽️</span>}
        />
      </div>

      {/* Siparişler tablosu */}
      <OrdersTable
        orders={orders}
        onViewDetails={handleViewOrderDetails}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Garson çağrıları tablosu */}
      <WaiterCallsTable
        waiterCalls={waiterCalls}
        onUpdateStatus={handleUpdateWaiterCallStatus}
      />

      {/* Sipariş detay modalı */}
      {showOrderModal && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Sipariş #{currentOrder.id} Detayları</h2>
              <button
                onClick={handleCloseOrderModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <p>
                <span className="font-semibold">Masa:</span> {currentOrder.table_number || `Masa ${currentOrder.table_id}`}
              </p>
              <p>
                <span className="font-semibold">Oluşturulma Tarihi:</span>{' '}
                {new Date(currentOrder.created_at).toLocaleString('tr-TR')}
              </p>
              <p>
                <span className="font-semibold">Durum:</span>{' '}
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    currentOrder.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : currentOrder.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : currentOrder.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : currentOrder.status === 'ready'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {currentOrder.status === 'new'
                    ? 'Yeni'
                    : currentOrder.status === 'processing'
                    ? 'Hazırlanıyor'
                    : currentOrder.status === 'ready'
                    ? 'Hazır'
                    : currentOrder.status === 'completed'
                    ? 'Tamamlandı'
                    : 'İptal Edildi'}
                </span>
              </p>

              {currentOrder.special_instructions && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Özel Talimatlar</h4>
                  <p className="mt-1 text-sm text-gray-900">{currentOrder.special_instructions}</p>
                </div>
              )}

              <div className="mt-4">
                <h3 className="font-semibold">Sipariş Öğeleri:</h3>
                {!currentOrder.items || !Array.isArray(currentOrder.items) || currentOrder.items.length === 0 ? (
                  <div className="mt-2 rounded bg-yellow-50 p-3 text-yellow-600">
                    <p>Sipariş için detay bilgisi bulunamadı.</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {currentOrder.items.map((item, index) => (
                      <div key={index} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.product_name || `Ürün #${item.product_id}`}</p>
                            <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                            {(item.special_instructions || item.special_instructions) && (
                              <p className="text-sm text-gray-500">Not: {item.special_instructions || item.special_instructions}</p>
                            )}

                            {/* Seçenekleri göster */}
                            {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-medium text-gray-600">Seçenekler:</p>
                                <ul className="ml-2 text-xs text-gray-500">
                                  {item.options.map((option, optIdx) => (
                                    <li key={optIdx}>
                                      {option.product_option_name || option.product_option_name || `Seçenek #${option.product_option_id}`}
                                      {(() => {
                                        // Fiyat için güvenli formatlamak
                                        let price = 0;
                                        if (typeof option.price === 'number') {
                                          price = option.price;
                                        } else if (option.price) {
                                          const parsed = Number.parseFloat(String(option.price));
                                          if (!isNaN(parsed)) {
                                            price = parsed;
                                          }
                                        }
                                        return price > 0 ? ` (+${price.toFixed(2)} ₺)` : '';
                                      })()}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold">
                            {(() => {
                              // Güvenli fiyat hesaplama
                              let unitPrice = 0;
                              if (typeof item.price === 'number') {
                                unitPrice = item.price;
                              } else if (item.price) {
                                const parsed = Number.parseFloat(String(item.price));
                                if (!isNaN(parsed)) unitPrice = parsed;
                              }
                              const quantity = item.quantity || 1;
                              return `${(unitPrice * quantity).toFixed(2)} ₺`;
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 px-4 py-3 sm:flex sm:justify-between">
                <p className="pt-2 text-gray-500">Toplam Tutar</p>
                <p className="text-lg font-bold">
                  {(() => {
                    // Sayı kontrolü ve güvenli dönüşüm
                    let amount = 0;
                    if (typeof currentOrder.total_amount === 'number') {
                      amount = currentOrder.total_amount;
                    } else if (currentOrder.total_amount) {
                      const parsed = Number.parseFloat(String(currentOrder.total_amount));
                      if (!isNaN(parsed)) {
                        amount = parsed;
                      }
                    }
                    return `${amount.toFixed(2)} ₺`;
                  })()}
                </p>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={handleCloseOrderModal}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                >
                  Kapat
                </button>
                {currentOrder.status === 'new' && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(currentOrder.id, 'processing');
                      handleCloseOrderModal();
                    }}
                    className="rounded-md bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
                  >
                    Hazırla
                  </button>
                )}
                {currentOrder.status === 'processing' && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(currentOrder.id, 'ready');
                      handleCloseOrderModal();
                    }}
                    className="rounded-md bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
                  >
                    Hazır
                  </button>
                )}
                {currentOrder.status === 'ready' && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(currentOrder.id, 'completed');
                      handleCloseOrderModal();
                    }}
                    className="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  >
                    Tamamla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
