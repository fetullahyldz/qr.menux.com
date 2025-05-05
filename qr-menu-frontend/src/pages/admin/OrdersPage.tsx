import React, { useState, useEffect, useCallback } from 'react';
import { orderService, tableService } from '../../services';
import { webSocketService } from '../../services/websocket.service'; // WebSocket servisi
import type { IOrder, IOrderItem, ITable } from '../../types';

// Sipariş detay bileşeni (modal)
const OrderDetailModal = ({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: IOrder;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
}) => {
  const [status, setStatus] = useState<string>(order.status);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadOrderItems = async () => {
      if (!order.items || order.items.length === 0) {
        try {
          setLoadingDetails(true);
          setError('');
          console.log(`Modalda sipariş öğeleri yükleniyor: ${order.id}`);

          try {
            const orderDetail = await orderService.getOrderById(order.id);
            if (orderDetail && orderDetail.items && orderDetail.items.length > 0) {
              console.log('Sipariş detayları orderDetail ile yüklendi:', orderDetail.items);
              order.items = orderDetail.items;
              setLoadingDetails(false);
              return;
            }
          } catch (orderDetailError) {
            console.warn('getOrderById ile sipariş detayları alınamadı:', orderDetailError);
          }

          const items = await orderService.getOrderItems(order.id);

          if (items && items.length > 0) {
            console.log('Sipariş öğeleri yüklendi:', items);
            const processedItems = items.map(item => {
              const safeItem = { ...item };
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }
              if (!safeItem.options) {
                safeItem.options = [];
              } else if (Array.isArray(safeItem.options)) {
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
            order.items = processedItems;
          } else {
            console.warn('Sipariş öğeleri boş döndü');
            order.items = [];
          }
        } catch (err) {
          console.error('Sipariş öğeleri yüklenirken hata:', err);
          setError('Sipariş detayları yüklenemedi');
          order.items = [];
        } finally {
          setLoadingDetails(false);
        }
      }
    };
    loadOrderItems();
  }, [order]);

  const setStatusValidated = (newStatus: string) => {
    if (['new', 'processing', 'ready', 'completed', 'cancelled'].includes(newStatus)) {
      setStatus(newStatus as 'new' | 'processing' | 'ready' | 'completed' | 'cancelled');
    } else {
      console.error('Invalid status value:', newStatus);
    }
  };

  const handleStatusChange = async () => {
    onUpdateStatus(order.id, status);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Yeni';
      case 'processing': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('Geçersiz tarih formatı:', dateString);
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-lg bg-white shadow-xl">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Sipariş Detayı</h3>

          {error && (
            <div className="mt-4 bg-red-50 p-3 rounded text-red-600">
              <p>{error}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Sipariş No</h4>
              <p className="mt-1 text-sm text-gray-900">#{order.id}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Masa</h4>
              <p className="mt-1 text-sm text-gray-900">{order.table_number || `Masa #${order.table_id}` || 'Belirtilmemiş'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Tarih</h4>
              <p className="mt-1 text-sm text-gray-900">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Tutar:</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {(() => {
                  let amount = 0;
                  if (typeof order.total_amount === 'number') {
                    amount = order.total_amount;
                  } else if (order.total_amount) {
                    const parsed = Number.parseFloat(String(order.total_amount));
                    if (!isNaN(parsed)) {
                      amount = parsed;
                    }
                  }
                  return `${amount.toFixed(2)} ₺`;
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Durum:</p>
              <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <select
                  className={`w-full sm:w-auto rounded-md border-gray-300 p-1 text-sm ${getStatusColorClass(status)}`}
                  value={status}
                  onChange={(e) => setStatusValidated(e.target.value)}
                >
                  <option value="new" className="bg-blue-100 text-blue-800">Yeni</option>
                  <option value="processing" className="bg-yellow-100 text-yellow-800">Hazırlanıyor</option>
                  <option value="ready" className="bg-purple-100 text-purple-800">Hazır</option>
                  <option value="completed" className="bg-green-100 text-green-800">Tamamlandı</option>
                  <option value="cancelled" className="bg-red-100 text-red-800">İptal Edildi</option>
                </select>
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-primary px-3 py-1 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
                  onClick={handleStatusChange}
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>

          {order.special_instructions && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-500">Özel Talimatlar</h4>
              <p className="mt-1 text-sm text-gray-900">{order.special_instructions}</p>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900">Sipariş Detayları</h4>

            {loadingDetails ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : !order.items || order.items.length === 0 ? (
              <div className="mt-2 bg-yellow-50 p-3 rounded text-yellow-600">
                <p>Sipariş detayı bulunamadı.</p>
              </div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 hidden sm:table-header-group">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ürün
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Adet
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {order.items.map((item) => (
                      <tr key={item.id} className="flex flex-col sm:table-row border-b sm:border-0 p-4 sm:p-0">
                        <td className="sm:whitespace-normal px-4 sm:px-6 py-2 sm:py-4 text-sm text-gray-900 flex flex-col">
                          <div className="font-medium">
                            {item.product_name || `Ürün #${item.product_id}`}
                          </div>
                          {item.special_instructions && (
                            <div className="mt-1 text-xs text-gray-500">{item.special_instructions}</div>
                          )}
                          {item.options && item.options.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-medium text-gray-600">Seçenekler:</p>
                              <ul className="mt-1 list-disc pl-4 text-xs text-gray-500">
                                {item.options.map((option, idx) => {
                                  const price = typeof option.price === 'number'
                                    ? option.price
                                    : Number.parseFloat(String(option.price || 0));
                                  const optionName = option.product_option_name ||
                                    `Seçenek #${option.product_option_id || idx + 1}`;
                                  return (
                                    <li key={option.id || `option-${idx}`}>
                                      {optionName}
                                      {price > 0 ? ` (+${price.toFixed(2)} ₺)` : ''}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 text-sm text-gray-500">
                          <span className="sm:hidden font-medium">Adet: </span>{item.quantity}
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 text-right">
                          <span className="sm:hidden font-medium">Tutar: </span>
                          {(() => {
                            const price = typeof item.price === 'number'
                              ? item.price
                              : Number.parseFloat(String(item.price || 0));
                            return `${(price * item.quantity).toFixed(2)} ₺`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  // Sayfalama için state'ler
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 80; // Her sayfada 10 sipariş gösterilecek

  const fetchData = async () => {
    try {
      setLoading(true);
      const tablesData = await tableService.getTables();
      setTables(tablesData);
      const params: { status?: string } = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const ordersData = await orderService.getOrders(params);
      console.log('API\'den gelen siparişler:', ordersData);
      if (ordersData.length === 0) {
        console.log('API\'den hiç sipariş gelmedi');
      }
      const processedOrders = ordersData.map(order => {
        if (!order.table_number && order.table_id && tablesData.length > 0) {
          const table = tablesData.find(t => t.id === order.table_id);
          if (table) {
            order.table_number = table.table_number;
          } else {
            order.table_number = `Masa ${order.table_id}`;
          }
        }
        return order;
      });
      // En yeniden eskiye sıralama
      const sortedOrders = processedOrders.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sortedOrders);
      setError('');
      setCurrentPage(1); // Yeni veri geldiğinde sayfayı sıfırla
    } catch (err) {
      console.error('Veriler yüklenirken hata oluştu:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
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

    let shouldFetchData = false;
    const newOrders: IOrder[] = [];
    const updatedOrderIds: number[] = [];

    for (const message of messages) {
      try {
        if (message.type === 'new_order') {
          const orderData = message.data;
          console.log(`Yeni sipariş alındı: #${orderData.id}`);
          // Masa numarasını ayarla
          if (!orderData.table_number && orderData.table_id && tables.length > 0) {
            const table = tables.find(t => t.id === orderData.table_id);
            if (table) {
              orderData.table_number = table.table_number;
            } else {
              orderData.table_number = `Masa ${orderData.table_id}`;
            }
          }
          newOrders.push(orderData);
          shouldFetchData = true;
        } else if (message.type === 'order_ready') {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === message.data.id ? { ...order, status: 'ready' } : order
            )
          );
          updatedOrderIds.push(message.data.id);
          shouldFetchData = true;
        } else if (message.type === 'order_completed') {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === message.data.id ? { ...order, status: 'completed' } : order
            )
          );
          setSelectedOrder((prev) =>
            prev && prev.id === message.data.id
              ? { ...prev, status: 'completed' }
              : prev
          );
          updatedOrderIds.push(message.data.id);
          shouldFetchData = true;
        }
      } catch (error) {
        console.error(`WebSocket mesajı işlenirken hata (${message.type}):`, error);
        setError(`WebSocket mesajı işlenirken bir hata oluştu: ${message.type}`);
      }
    }

    if (newOrders.length > 0) {
      setOrders((prev) => {
        const updatedOrders = [...newOrders, ...prev];
        // En yeniden eskiye sıralama
        return updatedOrders.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
      setCurrentPage(1); // Yeni sipariş geldiğinde ilk sayfaya dön
    }

    if (shouldFetchData) {
      await fetchData();
    }
  }, [wsQueue, tables]);

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

    fetchData();

    return () => {
      webSocketService.disconnect();
    };
  }, [statusFilter]);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      setLoading(true);
      const result = await orderService.updateOrderStatus(id, status as any);
      if (result) {
        setSuccessMessage('Sipariş durumu başarıyla güncellendi');
        await fetchData();
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({
            ...selectedOrder,
            status: status as any,
          });
        }
      } else {
        setError('Sipariş durumu güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Sipariş durumu güncellenirken hata oluştu:', err);
      setError('Sipariş durumu güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (order: IOrder) => {
    try {
      setLoading(true);
      console.log('Sipariş detayı görüntüleniyor:', order);
      try {
        const orderDetail = await orderService.getOrderById(order.id);
        if (orderDetail) {
          console.log('Güncel sipariş detayları alındı:', orderDetail);
          if (!orderDetail.items || orderDetail.items.length === 0) {
            console.log('Sipariş için kalemler ayrıca yükleniyor:', order.id);
            try {
              const items = await orderService.getOrderItems(order.id);
              if (items && items.length > 0) {
                console.log('API\'den sipariş öğeleri yüklendi:', items);
                orderDetail.items = items;
              } else {
                console.warn('API\'den sipariş öğeleri yüklenemedi');
                orderDetail.items = [];
              }
            } catch (itemsError) {
              console.error('Sipariş öğeleri yüklenirken hata:', itemsError);
              orderDetail.items = [];
            }
          }
          const processedOrder = {
            ...orderDetail,
            table_number: orderDetail.table_number || `Masa ${orderDetail.table_id}`,
            items: (orderDetail.items || []).map(item => {
              const safeItem = { ...item };
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }
              if (!safeItem.options) {
                safeItem.options = [];
              } else if (Array.isArray(safeItem.options)) {
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
            }),
          };
          setSelectedOrder(processedOrder);
          setLoading(false);
          return;
        }
      } catch (orderDetailError) {
        console.warn('getOrderById ile sipariş detayları alınamadı:', orderDetailError);
      }
      const processedOrder = { ...order };
      if (!processedOrder.items || processedOrder.items.length === 0) {
        console.log('Sipariş için kalemler alternatif yolla yükleniyor:', order.id);
        try {
          const items = await orderService.getOrderItems(order.id);
          if (items && items.length > 0) {
            console.log('Alternatif: API\'den sipariş öğeleri yüklendi:', items);
            processedOrder.items = items.map(item => {
              const safeItem = { ...item };
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }
              if (!safeItem.options) {
                safeItem.options = [];
              } else if (Array.isArray(safeItem.options)) {
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
          } else {
            console.warn('API\'den sipariş öğeleri alınamadı');
            processedOrder.items = [];
          }
        } catch (itemsError) {
          console.error('Alternatif: Sipariş öğeleri yüklenirken hata:', itemsError);
          processedOrder.items = [];
        }
      } else {
        console.log('Sipariş zaten items içeriyor, güvenlik kontrolleri yapılıyor');
        processedOrder.items = (processedOrder.items || []).map(item => {
          const safeItem = { ...item };
          if (!safeItem.product_name || safeItem.product_name.trim() === '') {
            safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
          }
          if (!safeItem.options) {
            safeItem.options = [];
          } else if (Array.isArray(safeItem.options)) {
            safeItem.options = safeItem.options.map(option => {
              const safeOption = { ...option };
              if (!safeOption.product_option_name && safeOption.product_option_name) {
                safeOption.product_option_name = safeOption.product_option_name;
              } else if (!safeOption.product_option_name) {
                safeOption.product_option_name = `Seçenek #${safeOption.product_option_id || safeOption.id || 'Bilinmeyen'}`;
              }
              return safeOption;
            });
          } else {
            safeItem.options = [];
          }
          return safeItem;
        });
      }
      if (!processedOrder.table_number) {
        processedOrder.table_number = `Masa ${processedOrder.table_id}`;
      }
      setSelectedOrder(processedOrder);
    } catch (error) {
      console.error('Sipariş detayları yüklenirken hata oluştu:', error);
      setError('Sipariş detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Yeni';
      case 'processing': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sayfalama için gerekli hesaplamalar
  const totalItems = orders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  // Sayfa değiştirme işlevleri
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Sayfa numaralarını oluştur
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // Görünür sayfa sayısı
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Siparişler</h1>
        <div className="w-full sm:w-auto">
          <select
            className="w-full sm:w-auto rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Siparişler</option>
            <option value="new">Yeni</option>
            <option value="processing">Hazırlanıyor</option>
            <option value="ready">Hazır</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex items-center">
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
            <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex items-center">
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
            <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-6">
          <div className="animate-spin inline-block h-6 w-6 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      )}

      {!loading && orders.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-md">
          <p className="text-gray-500">Sipariş bulunamadı.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 sm:overflow-hidden sm:rounded-lg sm:bg-white sm:shadow-md">
            {/* Mobil için kart düzeni */}
            <div className="sm:hidden flex flex-col gap-4">
              {currentOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">Sipariş No: #{order.id}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColorClass(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Masa: </span>{order.table_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Tarih: </span>{formatDate(order.created_at)}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Tutar: </span>
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
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="w-full sm:w-auto text-primary hover:text-primary-dark text-sm font-medium"
                      >
                        Detaylar
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
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Sipariş No
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Masa
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Tarih
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Tutar
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
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {currentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {order.table_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColorClass(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-primary hover:text-primary-dark"
                      >
                        Detaylar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sayfalama Kontrolleri */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Toplam {totalItems} sipariş, {currentPage}. sayfa / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  Önceki
                </button>

                {/* Sayfa numaraları */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default OrdersPage;