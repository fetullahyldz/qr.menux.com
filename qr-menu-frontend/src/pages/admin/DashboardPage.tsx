import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Howl } from 'howler';
import { webSocketService } from '../../services/websocket.service';
import {
  statisticsService,
  orderService,
  waiterCallService,
} from '../../services';
import type { IOrder, IWaiterCall } from '../../types';

// İstatistik kartı bileşeni
const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) => (
  <div className="rounded-lg bg-white p-4 sm:p-6 shadow-md">
    <div className="flex items-center">
      <div className="mr-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary-100 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-xs sm:text-sm font-medium text-gray-500">{title}</h2>
        <p className="text-lg sm:text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

// Sipariş tablosu bileşeni
const OrdersTable = ({
  orders,
  onViewDetails,
  onUpdateStatus,
}: {
  orders: IOrder[];
  onViewDetails: (orderId: number) => void;
  onUpdateStatus: (
    orderId: number,
    status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled'
  ) => void;
}) => (
  <div className="mt-6 sm:mt-8 rounded-lg bg-white shadow-md">
    <div className="p-4 sm:p-6">
      <h2 className="mb-4 text-base sm:text-lg font-semibold text-gray-800">
        Son Siparişler
      </h2>
    </div>
    {/* Mobile: Card-based layout */}
    <div className="block sm:hidden space-y-4 p-4">
      {orders.length > 0 ? (
        orders
          .filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
          .map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">Sipariş ID:</span>
                  <span className="text-sm">#{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-sm">Masa:</span>
                  <span className="text-sm">{order.table_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-sm">Tutar:</span>
                  <span className="text-sm">
                    {(() => {
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
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-sm">Durum:</span>
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
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-sm">Tarih:</span>
                  <span className="text-sm">
                    {new Date(order.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                    onClick={() => onViewDetails(order.id)}
                  >
                    Detay
                  </button>
                  {order.status === 'new' && (
                    <button
                      className="text-yellow-600 hover:text-yellow-900 text-sm"
                      onClick={() => onUpdateStatus(order.id, 'processing')}
                    >
                      Hazırla
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      className="text-purple-600 hover:text-purple-900 text-sm"
                      onClick={() => onUpdateStatus(order.id, 'ready')}
                    >
                      Hazır
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      className="text-green-600 hover:text-green-900 text-sm"
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                    >
                      Tamamla
                    </button>
                  )}
                  {(order.status === 'new' ||
                    order.status === 'processing' ||
                    order.status === 'ready') && (
                    <button
                      className="text-red-600 hover:text-red-900 text-sm"
                      onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    >
                      İptal
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
      ) : (
        <div className="p-4 text-center text-sm text-gray-500">
          Henüz sipariş bulunmuyor
        </div>
      )}
    </div>
    {/* Desktop: Table layout */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Sipariş ID
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Masa
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tutar
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Durum
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tarih
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {orders.length > 0 ? (
            orders
              .filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
              .map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    #{order.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {order.table_number}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {(() => {
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
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => onViewDetails(order.id)}
                      >
                        Detay
                      </button>
                      {order.status === 'new' && (
                        <button
                          className="text-yellow-600 hover:text-yellow-900"
                          onClick={() => onUpdateStatus(order.id, 'processing')}
                        >
                          Hazırla
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => onUpdateStatus(order.id, 'ready')}
                        >
                          Hazır
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => onUpdateStatus(order.id, 'completed')}
                        >
                          Tamamla
                        </button>
                      )}
                      {(order.status === 'new' ||
                        order.status === 'processing' ||
                        order.status === 'ready') && (
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => onUpdateStatus(order.id, 'cancelled')}
                        >
                          İptal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
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
  onUpdateStatus,
}: {
  waiterCalls: IWaiterCall[];
  onUpdateStatus: (
    callId: number,
    status: 'pending' | 'in_progress' | 'completed'
  ) => void;
}) => (
  <div className="mt-6 sm:mt-8 rounded-lg bg-white shadow-md">
    <div className="p-4 sm:p-6">
      <h2 className="mb-4 text-base sm:text-lg font-semibold text-gray-800">
        Garson Çağrıları
      </h2>
    </div>
    {/* Mobile: Card-based layout */}
    <div className="block sm:hidden space-y-4 p-4">
      {waiterCalls.length > 0 ? (
        waiterCalls.map((call) => (
          <div
            key={call.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-sm">ID:</span>
                <span className="text-sm">#{call.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-sm">Masa:</span>
                <span className="text-sm">{call.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-sm">Durum:</span>
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
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-sm">Tarih:</span>
                <span className="text-sm">
                  {new Date(call.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {call.status === 'pending' && (
                  <button
                    className="text-blue-600 hover:text-blue-900 text-sm"
                    onClick={() => onUpdateStatus(call.id, 'in_progress')}
                  >
                    Başla
                  </button>
                )}
                {call.status === 'in_progress' && (
                  <button
                    className="text-green-600 hover:text-green-900 text-sm"
                    onClick={() => onUpdateStatus(call.id, 'completed')}
                  >
                    Tamamla
                  </button>
                )}
                {call.status !== 'completed' && (
                  <button
                    className="text-red-600 hover:text-red-900 text-sm"
                    onClick={() => onUpdateStatus(call.id, 'completed')}
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-sm text-gray-500">
          Aktif garson çağrısı bulunmuyor
        </div>
      )}
    </div>
    {/* Desktop: Table layout */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              ID
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Masa
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Durum
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tarih
            </th>
            <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {waiterCalls.length > 0 ? (
            waiterCalls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                  #{call.id}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                  {call.table_number}
                </td>
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
                <td className="px-6 py-4 text-sm">
                  <div className="flex space-x-2">
                    {call.status === 'pending' && (
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => onUpdateStatus(call.id, 'in_progress')}
                      >
                        Başla
                      </button>
                    )}
                    {call.status === 'in_progress' && (
                      <button
                        className="text-green-600 hover:text-green-900"
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
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                Aktif garson çağrısı bulunmuyor
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// DashboardPage bileşeni
const DashboardPage = () => {
  // State tanımlamaları
  const [stats, setStats] = useState({
    totalOrders: 0,
    todaySales: 0,
    activeWaiterCalls: 0,
    activeTables: 0,
  });

  const [orders, setOrders] = useState<IOrder[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<IWaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [timers, setTimers] = useState<{ [key: number]: string }>({});
  const [itemStatuses, setItemStatuses] = useState<{ [key: number]: 'preparing' | 'ready' }>({});

  // Sesli bildirim için fonksiyon
  const playNotification = async () => {
    const sound = new Howl({
      src: ['/sounds/notification.mp3'],
      volume: 0.5,
    });
    sound.play();
  };

  // Geri sayım sayacı için yardımcı fonksiyon
  const getRemainingTime = (createdAt: string, duration: number) => {
    const created = new Date(createdAt);
    const endTime = new Date(created.getTime() + duration * 60 * 1000);
    const now = new Date();
    const diffMs = endTime.getTime() - now.getTime();
    if (diffMs <= 0) return '0:00';
    const minutes = Math.floor(diffMs / 1000 / 60);
    const seconds = Math.floor((diffMs / 1000) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


 // Sipariş öğelerini yükleyen yardımcı fonksiyon
const loadOrderItems = async (order: IOrder): Promise<IOrder> => {
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    try {
      console.log(`Sipariş #${order.id} için öğeler yükleniyor...`);
      const orderItems = await orderService.getOrderItems(order.id);
      if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
        console.log(`Sipariş #${order.id} için öğeler yüklendi:`, orderItems);
        return {
          ...order,
          items: orderItems.map((item) => ({
            ...item,
            duration: item.duration ?? 0,
            status: item.status || 'preparing',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            quantity: item.quantity || 1,
            price: item.price || 0,
          })),
        };
      } else {
        console.log(`Sipariş #${order.id} için öğe bulunamadı, boş dizi oluşturuldu`);
        return { ...order, items: [] };
      }
    } catch (error) {
      console.error(`Sipariş #${order.id} için öğeler yüklenirken hata:`, error);
      toast.error(`Sipariş #${order.id} için öğeler yüklenemedi`);
      return { ...order, items: [] };
    }
  }
  console.log(`Sipariş #${order.id} için öğeler zaten mevcut:`, order.items);
  return order;
};

// Sipariş statüsünü öğelere göre güncelleyen yardımcı fonksiyon
const updateOrderStatusBasedOnItems = async (
  order: IOrder,
  updateService: (orderId: number, status: 'ready' | 'completed', itemId?: number) => Promise<void>,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
): Promise<IOrder> => {
  if (!order.items || order.items.length === 0) {
    console.log(`Sipariş #${order.id} için öğe bulunamadı, durum güncellenmedi.`);
    return order;
  }

  let allItemsReady = true;
  const updatedItems = await Promise.all(
    order.items.map(async (item) => {
      const remainingTime = getRemainingTime(item.created_at, item.duration);
      console.log(
        `Sipariş #${order.id}, Ürün #${item.id}: Kalan süre ${remainingTime}, Mevcut durum ${item.status}`
      );
      if (remainingTime === '0:00' && item.status !== 'ready') {
        try {
          await updateService(order.id, 'ready', item.id);
          console.log(`Ürün #${item.id} durumu 'ready' olarak güncellendi.`);
          return { ...item, status: 'ready' as const };
        } catch (error) {
          console.error(`Ürün #${item.id} durumu güncellenemedi:`, error);
          onError?.(`Ürün #${item.id} durumu güncellenemedi`);
          allItemsReady = false;
          return item;
        }
      }
      if (item.status !== 'ready') {
        allItemsReady = false;
      }
      return item;
    })
  );

  if (
    allItemsReady &&
    order.status !== 'completed' &&
    order.status !== 'cancelled'
  ) {
    try {
      await updateService(order.id, 'completed');
      console.log(`Sipariş #${order.id} durumu 'completed' olarak güncellendi.`);
      onSuccess?.(`Sipariş #${order.id} tamamlandı!`);
      return { ...order, items: updatedItems, status: 'completed' as const };
    } catch (error) {
      console.error(`Sipariş #${order.id} durumu güncellenemedi:`, error);
      onError?.(`Sipariş #${order.id} durumu güncellenmedi`);
      return { ...order, items: updatedItems };
    }
  }

  return { ...order, items: updatedItems };
};

// Geri sayım sayacı ve durum güncellemeleri için interval
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      // Orders dizisi için kontrol (liste kısmı)
      const updatedOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.status === 'completed' || order.status === 'cancelled') {
            console.log(`Sipariş #${order.id} zaten tamamlanmış veya iptal edilmiş, atlanıyor.`);
            return order;
          }

          let orderToUpdate = order;
          if (!order.items || order.items.length === 0) {
            console.log(`Sipariş #${order.id} için items eksik, yeniden yükleniyor...`);
            orderToUpdate = await loadOrderItems(order);
          }

          const updatedOrder = await updateOrderStatusBasedOnItems(
            orderToUpdate,
            async (orderId, status, itemId) => {
              if (status === 'ready' && itemId) {
                console.log(`Ürün #${itemId} durumu 'ready' olarak güncelleniyor...`);
                await orderService.updateOrderItemStatus(orderId, itemId, 'ready');
              } else if (status === 'completed') {
                console.log(`Sipariş #${orderId} durumu 'completed' olarak güncelleniyor...`);
                await orderService.updateOrderStatus(orderId, 'completed');
              }
            },
            (message) => {
              toast.success(message);
              console.log(message);
            },
            (message) => {
              toast.error(message);
              console.error(message);
            }
          );

          console.log(
            `Sipariş #${updatedOrder.id} kontrol edildi, yeni durum: ${updatedOrder.status}`
          );

          return updatedOrder;
        })
      );

      // Güncellenmiş siparişleri state'e kaydet, tamamlanmış ve iptal edilmişleri filtrele
      setOrders(
        updatedOrders.filter(
          (order) => order.status !== 'completed' && order.status !== 'cancelled'
        )
      );
    } catch (error) {
      console.error('Interval sırasında hata:', error);
      toast.error('Siparişler güncellenirken bir hata oluştu');
    }
  }, 1000);

  return () => clearInterval(interval);
}, [orders]);

  // API'den verileri al
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardStats = await statisticsService.getDashboardStats();
      if (dashboardStats) {
        setStats(dashboardStats);
      } else {
        const recentOrders = await orderService.getOrders();
        const pendingOrders = recentOrders.filter(
          (o) =>
            o.status === 'new' ||
            o.status === 'processing' ||
            o.status === 'ready'
        ).length;

        const today = new Date().toISOString().split('T')[0];
        const todayOrders = recentOrders.filter(
          (o) =>
            new Date(o.created_at).toISOString().split('T')[0] === today
        );
        const todaySales = todayOrders.reduce((total, order) => {
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

        const activeCallsCount =
          await waiterCallService.getActiveWaiterCallsCount();

        setStats({
          totalOrders: recentOrders.length,
          todaySales: todaySales,
          activeWaiterCalls: activeCallsCount,
          activeTables: 5,
        });
      }

      try {
        let recentOrders: IOrder[] = [];
        if (orderService.getRecentOrders) {
          recentOrders = await orderService.getRecentOrders(5);
          console.log('Sunucudan alınan son siparişler:', recentOrders);
        } else {
          const allOrders = await orderService.getOrders();
          const sorted = [...allOrders].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          recentOrders = sorted.slice(0, 5);
          console.log('Sunucudan alınan sıralı siparişler:', recentOrders);
        }

        const ordersWithItems = await Promise.all(
          recentOrders.map(async (order) => await loadOrderItems(order))
        );
        console.log('Items ile birlikte siparişler:', ordersWithItems);
        setOrders(ordersWithItems);
      } catch (orderError) {
        console.error('Error fetching recent orders:', orderError);
        const allOrders = await orderService.getOrders();
        const sorted = [...allOrders].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const recentOrders = sorted.slice(0, 5);
        const ordersWithItems = await Promise.all(
          recentOrders.map(async (order) => await loadOrderItems(order))
        );
        setOrders(ordersWithItems);
      }

      try {
        const activeWaiterCalls = await waiterCallService.getWaiterCalls({
          status: 'pending',
        });
        const inProgressWaiterCalls = await waiterCallService.getWaiterCalls({
          status: 'in_progress',
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

  // WebSocket mesajlarını toplu işlemek için bir kuyruk
  const [wsQueue, setWsQueue] = useState<Array<{ type: string; data: any }>>([]);

  // WebSocket mesajlarını işleyen fonksiyon (debounced)
  const processWsQueue = useCallback(async () => {
    if (wsQueue.length === 0) return;

    const messages = [...wsQueue];
    setWsQueue([]); // Kuyruğu temizle

    let shouldFetchDashboard = false;
    const newOrders: IOrder[] = [];
    const updatedOrderIds: number[] = [];

    for (const message of messages) {
      try {
        if (message.type === 'new_order') {
          let orderData = message.data;
          if (!orderData.items || orderData.items.length === 0) {
            console.log(`Yeni sipariş #${orderData.id} için öğeler yükleniyor...`);
            orderData = await loadOrderItems(orderData);
          } else {
            console.log(`Yeni sipariş #${orderData.id} zaten öğelerle geldi:`, orderData.items);
          }
          newOrders.push(orderData);
          shouldFetchDashboard = true;
          playNotification();
          toast.success(`Yeni sipariş #${orderData.id} alındı!`);
        } else if (message.type === 'new_waiter_call') {
          setWaiterCalls((prev) => {
            const updatedCalls = [message.data, ...prev];
            return updatedCalls.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
          });
          setStats((prev) => ({
            ...prev,
            activeWaiterCalls: prev.activeWaiterCalls + 1,
          }));
          playNotification();
          toast.success(`Masa ${message.data.table_number} garson çağırdı!`);
        } else if (message.type === 'order_ready') {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === message.data.id ? { ...order, status: 'ready' } : order
            )
          );
          updatedOrderIds.push(message.data.id);
          shouldFetchDashboard = true;
          playNotification();
          toast.success(`Sipariş #${message.data.id} hazır!`);
        } else if (message.type === 'order_completed') {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === message.data.id ? { ...order, status: 'completed' } : order
            )
          );
          setCurrentOrder((prev) =>
            prev && prev.id === message.data.id
              ? { ...prev, status: 'completed' }
              : prev
          );
          updatedOrderIds.push(message.data.id);
          shouldFetchDashboard = true;
          playNotification();
          toast.success(`Sipariş #${message.data.id} tamamlandı!`);
        }
      } catch (error) {
        console.error(`WebSocket mesajı işlenirken hata (${message.type}):`, error);
        toast.error(`WebSocket mesajı işlenirken bir hata oluştu: ${message.type}`);
      }
    }

    if (newOrders.length > 0) {
      setOrders((prev) => {
        const updatedOrders = [...newOrders, ...prev].slice(0, 5);
        return updatedOrders.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
      });
    }

    if (shouldFetchDashboard) {
      await fetchDashboardData();
    }
  }, [wsQueue]);

  // WebSocket mesajlarını toplamak için debouncing etkisi
  useEffect(() => {
    const timer = setTimeout(() => {
      processWsQueue();
    }, 500);

    return () => clearTimeout(timer);
  }, [wsQueue, processWsQueue]);

  // WebSocket bağlantısını kur ve bildirimleri dinle
  useEffect(() => {
    webSocketService.connect((message) => {
      console.log('WebSocket mesajı alındı:', message);
      setWsQueue((prev) => [...prev, message]);
    });

    fetchDashboardData();

    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Geri sayım sayacı ve durum güncellemeleri için interval
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Orders dizisi için kontrol (liste kısmı)
        const updatedOrders = await Promise.all(
          orders.map(async (order) => {
            if (order.status === 'completed' || order.status === 'cancelled') {
              console.log(`Sipariş #${order.id} zaten tamamlanmış veya iptal edilmiş, atlanıyor.`);
              return order;
            }

            let orderToUpdate = order;
            if (!order.items || order.items.length === 0) {
              console.log(`Sipariş #${order.id} için items eksik, yeniden yükleniyor...`);
              orderToUpdate = await loadOrderItems(order);
            }

            const updatedOrder = await updateOrderStatusBasedOnItems(
              orderToUpdate,
              async (orderId, status, itemId) => {
                if (status === 'ready' && itemId) {
                  console.log(`Ürün #${itemId} durumu 'ready' olarak güncelleniyor...`);
                  await orderService.updateOrderItemStatus(orderId, itemId, 'ready');
                } else if (status === 'completed') {
                  console.log(`Sipariş #${orderId} durumu 'completed' olarak güncelleniyor...`);
                  await orderService.updateOrderStatus(orderId, 'completed');
                }
              },
              (message) => {
                toast.success(message);
                console.log(message);
              },
              (message) => {
                toast.error(message);
                console.error(message);
              }
            );

            console.log(
              `Sipariş #${updatedOrder.id} kontrol edildi, yeni durum: ${updatedOrder.status}`
            );

            // Eğer sipariş tamamlandıysa ve currentOrder bu siparişse, currentOrder'ı güncelle
            if (updatedOrder.status === 'completed' && currentOrder?.id === updatedOrder.id) {
              setCurrentOrder(updatedOrder);
            }

            return updatedOrder;
          })
        );

        // Güncellenmiş siparişleri state'e kaydet
        setOrders(updatedOrders);

        // Mevcut sipariş (currentOrder) için kontrol (modal açıkken)
        if (currentOrder && currentOrder.items) {
          const newTimers: { [key: number]: string } = {};
          const newItemStatuses = { ...itemStatuses };

          const updatedCurrentOrder = await updateOrderStatusBasedOnItems(
            currentOrder,
            async (orderId, status, itemId) => {
              if (status === 'ready' && itemId) {
                console.log(`Ürün #${itemId} durumu 'ready' olarak güncelleniyor...`);
                await orderService.updateOrderItemStatus(orderId, itemId, 'ready');
                newItemStatuses[itemId] = 'ready';
                newTimers[itemId] = '0:00';
              } else if (status === 'completed') {
                console.log(`Sipariş #${orderId} durumu 'completed' olarak güncelleniyor...`);
                await orderService.updateOrderStatus(orderId, 'completed');
              }
            },
            (message) => {
              toast.success(message);
              console.log(message);
            },
            (message) => {
              toast.error(message);
              console.error(message);
            }
          );

          if (updatedCurrentOrder.items) {
            updatedCurrentOrder.items.forEach((item) => {
              if (item.status !== 'ready') {
                newTimers[item.id] = getRemainingTime(item.created_at, item.duration);
              }
              newItemStatuses[item.id] = item.status || 'preparing';
            });
          }

          setTimers(newTimers);
          setItemStatuses(newItemStatuses);
          setCurrentOrder(updatedCurrentOrder);

          setOrders((prev) =>
            prev.map((o) => (o.id === updatedCurrentOrder.id ? updatedCurrentOrder : o))
          );
        }
      } catch (error) {
        console.error('Interval sırasında hata:', error);
        toast.error('Siparişler güncellenirken bir hata oluştu');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orders, currentOrder, itemStatuses]);

  // Sipariş öğesi durumunu güncelle
  const handleUpdateOrderItemStatus = async (
    orderId: number,
    itemId: number,
    status: 'preparing' | 'ready'
  ) => {
    try {
      await orderService.updateOrderItemStatus(orderId, itemId, status);
      toast.success(`Ürün #${itemId} durumu güncellendi!`);
      setItemStatuses((prev) => ({ ...prev, [itemId]: status }));

      const updatedOrder = await orderService.getOrderById(orderId);
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );

        if (updatedOrder.items) {
          const allItemsReady = updatedOrder.items.every(
            (item) => item.status === 'ready'
          );
          if (
            allItemsReady &&
            updatedOrder.status !== 'completed' &&
            updatedOrder.status !== 'cancelled'
          ) {
            await orderService.updateOrderStatus(orderId, 'completed');
            setCurrentOrder((prev) =>
              prev ? { ...prev, status: 'completed' } : null
            );
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId ? { ...o, status: 'completed' } : o
              )
            );
            toast.success(`Sipariş #${orderId} tamamlandı!`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Ürün durumu güncellenemedi.');
    }
  };

  // Sipariş ayrıntılarını görüntüle
  const handleViewOrderDetails = async (orderId: number) => {
    try {
      const orderDetail = await orderService.getOrderById(orderId);
      if (!orderDetail) {
        toast.error('Sipariş detayları bulunamadı');
        return;
      }

      const orderWithSafeItems = await loadOrderItems(orderDetail);

      const initialItemStatuses = orderWithSafeItems.items?.reduce(
        (acc, item) => {
          const status: 'preparing' | 'ready' =
            item.status === 'ready' ? 'ready' : 'preparing';
          acc[item.id] = status;
          return acc;
        },
        {} as { [key: number]: 'preparing' | 'ready' }
      ) || {};
      setItemStatuses(initialItemStatuses);

      setCurrentOrder(orderWithSafeItems);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Sipariş detayları alınırken hata:', error);
      toast.error('Sipariş detayları yüklenemedi');
    }
  };

  // Sipariş durumunu güncelle
  const handleUpdateOrderStatus = async (
    orderId: number,
    status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled'
  ) => {
    try {
      await orderService.updateOrderStatus(orderId, status);

      const recentOrders = await orderService.getRecentOrders(5);
      const ordersWithItems = await Promise.all(
        recentOrders.map(async (order) => await loadOrderItems(order))
      );
      setOrders(ordersWithItems);

      setCurrentOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, status } : prev
      );

      fetchDashboardData();

      toast.success(`Sipariş durumu başarıyla güncellendi`);
    } catch (error) {
      console.error('Sipariş durumu güncelleme hatası:', error);
      toast.error('Sipariş durumu güncellenirken bir hata oluştu');
    }
  };

  // Garson çağrısı durumunu güncelle
  const handleUpdateWaiterCallStatus = async (
    callId: number,
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    try {
      await waiterCallService.updateWaiterCallStatus(callId, status);

      if (status === 'completed') {
        setWaiterCalls(waiterCalls.filter((call) => call.id !== callId));
      } else {
        setWaiterCalls(
          waiterCalls.map((call) =>
            call.id === callId ? { ...call, status } : call
          )
        );
      }

      const activeCallsCount =
        await waiterCallService.getActiveWaiterCallsCount();
      setStats({
        ...stats,
        activeWaiterCalls: activeCallsCount,
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
    setItemStatuses({});
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-gray-800">
        Yönetim Paneli
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Sipariş"
          value={stats.totalOrders}
          icon={<span className="text-lg sm:text-xl">📊</span>}
        />
        <StatCard
          title="Bugünkü Kazanç"
          value={(() => {
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
          icon={<span className="text-lg sm:text-xl">💰</span>}
        />
        <StatCard
          title="Aktif Garson Çağrısı"
          value={stats.activeWaiterCalls}
          icon={<span className="text-lg sm:text-xl">🔔</span>}
        />
        <StatCard
          title="Aktif Masalar"
          value={stats.activeTables}
          icon={<span className="text-lg sm:text-xl">🍽️</span>}
        />
      </div>

      <OrdersTable
        orders={orders}
        onViewDetails={handleViewOrderDetails}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      <WaiterCallsTable
        waiterCalls={waiterCalls}
        onUpdateStatus={handleUpdateWaiterCallStatus}
      />

      {showOrderModal && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="max-h-[90vh] w-full max-w-md sm:max-w-lg md:max-w-2xl overflow-y-auto rounded-lg bg-white p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">
                Sipariş #{currentOrder.id} Detayları
              </h2>
              <button
                onClick={handleCloseOrderModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <p className="text-sm sm:text-base">
                <span className="font-semibold">Masa:</span>{' '}
                {currentOrder.table_number || `Masa ${currentOrder.table_id}`}
              </p>
              <p className="text-sm sm:text-base">
                <span className="font-semibold">Oluşturma Tarihi:</span>{' '}
                {new Date(currentOrder.created_at).toLocaleString('tr-TR')}
              </p>
              <p className="text-sm sm:text-base">
                <span className="font-semibold">Durum:</span>{' '}
                <span
                  className={`inline-flex rounded-full px-2 text-xs sm:text-sm font-semibold leading-5 ${
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
                  <h4 className="text-xs sm:text-sm font-medium text-gray-500">
                    Özel Talimatlar
                  </h4>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">
                    {currentOrder.special_instructions}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Sipariş Öğeleri:
                </h3>
                {!currentOrder.items ||
                !Array.isArray(currentOrder.items) ||
                currentOrder.items.length === 0 ? (
                  <div className="mt-2 rounded bg-yellow-50 p-3 text-yellow-600">
                    <p>Sipariş için detay bilgisi bulunamadı.</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {currentOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm sm:text-base">
                              {item.product_name ||
                                `Ürün #${item.product_id}`}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Adet: {item.quantity}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Hazırlık Süresi: {item.duration} dakika
                            </p>
                            {itemStatuses[item.id] === 'preparing' && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                Kalan Süre:{' '}
                                {timers[item.id] ||
                                  getRemainingTime(item.created_at, item.duration)}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-gray-500">
                              Durum:{' '}
                              {itemStatuses[item.id] === 'preparing'
                                ? 'Hazırlanıyor'
                                : 'Hazır'}
                            </p>
                            {(item.special_instructions ||
                              item.special_instructions) && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                Not:{' '}
                                {item.special_instructions ||
                                  item.special_instructions}
                              </p>
                            )}
                            {item.options &&
                              Array.isArray(item.options) &&
                              item.options.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-xs font-medium text-gray-600">
                                    Seçenekler:
                                  </p>
                                  <ul className="ml-2 text-xs text-gray-500">
                                    {item.options.map((option, optIdx) => (
                                      <li key={optIdx}>
                                        {option.product_option_name ||
                                          `Seçenek #${option.product_option_id}`}
                                        {(() => {
                                          let price = 0;
                                          if (typeof option.price === 'number') {
                                            price = option.price;
                                          } else if (option.price) {
                                            const parsed = Number.parseFloat(
                                              String(option.price)
                                            );
                                            if (!isNaN(parsed)) {
                                              price = parsed;
                                            }
                                          }
                                          return price > 0
                                            ? ` (+${price.toFixed(2)} ₺)`
                                            : '';
                                        })()}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            {(itemStatuses[item.id] === 'preparing' || itemStatuses[item.id] === 'ready') && (
                              <button
                                className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">
                                {itemStatuses[item.id] === 'preparing' ? 'Hazırlanıyor' : 'Hazır'}
                              </button>
                            )}
                          </div>
                          <p className="font-semibold text-sm sm:text-base">
                            {(() => {
                              let unitPrice = 0;
                              if (typeof item.price === 'number') {
                                unitPrice = item.price;
                              } else if (item.price) {
                                const parsed = Number.parseFloat(
                                  String(item.price)
                                );
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
                <p className="pt-2 text-gray-500 text-sm sm:text-base">
                  Toplam Tutar
                </p>
                <p className="text-base sm:text-lg font-bold">
                  {(() => {
                    let amount = 0;
                    if (typeof currentOrder.total_amount === 'number') {
                      amount = currentOrder.total_amount;
                    } else if (currentOrder.total_amount) {
                      const parsed = Number.parseFloat(
                        String(currentOrder.total_amount)
                      );
                      if (!isNaN(parsed)) {
                        amount = parsed;
                      }
                    }
                    return `${amount.toFixed(2)} ₺`;
                  })()}
                </p>
              </div>
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={handleCloseOrderModal}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 text-sm sm:text-base"
                >
                  Kapat
                </button>
                {currentOrder.status === 'new' && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(currentOrder.id, 'processing');
                      handleCloseOrderModal();
                    }}
                    className="rounded-md bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 text-sm sm:text-base"
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
                    className="rounded-md bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 text-sm sm:text-base"
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
                    className="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 text-sm sm:text-base"
                  >
                    Tamamla
                  </button>
                )}
                {(currentOrder.status === 'new' ||
                  currentOrder.status === 'processing' ||
                  currentOrder.status === 'ready') && (
                  <button
                    onClick={() => {
                      handleUpdateOrderStatus(currentOrder.id, 'cancelled');
                      handleCloseOrderModal();
                    }}
                    className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 text-sm sm:text-base"
                  >
                   Sipariş İptal
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