import React, { useState, useEffect } from 'react';
import { orderService, tableService } from '../../services';
import type { IOrder, IOrderItem, ITable } from '../../types';

// Sipariş detay bileşeni (modal)
const OrderDetailModal = ({
  order,
  onClose,
  onUpdateStatus
}: {
  order: IOrder;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
}) => {
  const [status, setStatus] = useState<string>(order.status);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Sipariş öğelerinin doğru yüklenip yüklenmediğini kontrol et
  useEffect(() => {
    const loadOrderItems = async () => {
      // Eğer sipariş öğeleri yoksa veya boşsa yükle
      if (!order.items || order.items.length === 0) {
        try {
          setLoadingDetails(true);
          setError('');
          console.log(`Modalda sipariş öğeleri yükleniyor: ${order.id}`);

          // Önce getOrderById ile tüm sipariş detaylarını almayı dene
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

          // getOrderItems endpointi ile deneyelim
          const items = await orderService.getOrderItems(order.id);

          if (items && items.length > 0) {
            console.log('Sipariş öğeleri yüklendi:', items);

            // Her öğe için güvenlik kontrolleri
            const processedItems = items.map(item => {
              const safeItem = { ...item };

              // Ürün adı kontrolü
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }

              // Seçenekler kontrolü
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
          // Boş bir dizi atayarak template'in render olmasını sağla
          order.items = [];
        } finally {
          setLoadingDetails(false);
        }
      }
    };

    loadOrderItems();
  }, [order]);

  // Status update function with type validation
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

  // Sipariş durumunu Türkçe olarak göster
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

  // Sipariş durumuna göre renk sınıfı
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

  // Tarih formatı
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('Geçersiz tarih formatı:', dateString);
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" />
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Sipariş Detayı</h3>

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
                          // Sayı kontrolü ve güvenli dönüşüm
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
                      <div className="mt-1">
                        <select
                          className={`rounded-md border-gray-300 p-1 text-sm ${getStatusColorClass(status)}`}
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
                          className="ml-2 inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-primary-dark"
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
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Ürün
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Adet
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Tutar
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="whitespace-normal px-6 py-4 text-sm text-gray-900">
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
                                          // Fiyat hesaplama
                                          const price = typeof option.price === 'number'
                                            ? option.price
                                            : Number.parseFloat(String(option.price || 0));

                                          // Seçenek adı
                                          const optionName = option.product_option_name ||
                                                           `Seçenek #${option.product_option_id || idx+1}`;

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
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
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

const OrdersPage = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Verileri yükle
  const fetchData = async () => {
    try {
      setLoading(true);

      // Masaları yükle
      const tablesData = await tableService.getTables();
      setTables(tablesData);

      // Filtreleme parametrelerini hazırla
      const params: { status?: string } = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Siparişleri yükle
      const ordersData = await orderService.getOrders(params);
      console.log('API\'den gelen siparişler:', ordersData);

      if (ordersData.length === 0) {
        console.log('API\'den hiç sipariş gelmedi');
      }

      // Gelen sipariş verilerinde table_number bilgisini doldur
      const processedOrders = ordersData.map(order => {
        // Table_number yoksa doldur
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

      setOrders(processedOrders);
      setError('');
    } catch (err) {
      console.error('Veriler yüklenirken hata oluştu:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Sipariş durumunu güncelle
  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      setLoading(true);
      const result = await orderService.updateOrderStatus(id, status as any);
      if (result) {
        setSuccessMessage('Sipariş durumu başarıyla güncellendi');
        await fetchData();

        // Eğer görüntülenen sipariş güncellendiyse, onu da güncelle
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({
            ...selectedOrder,
            status: status as any
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

  // Sipariş detay modalını aç
  const handleViewOrder = async (order: IOrder) => {
    try {
      setLoading(true);
      console.log('Sipariş detayı görüntüleniyor:', order);

      // Önce getOrderById ile güncel sipariş detaylarını alalım
      try {
        const orderDetail = await orderService.getOrderById(order.id);
        if (orderDetail) {
          console.log('Güncel sipariş detayları alındı:', orderDetail);

          // Sipariş öğeleri kontrolü
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

          // Güncel sipariş bilgilerini işle
          const processedOrder = {
            ...orderDetail,
            // Table_number yoksa doldur
            table_number: orderDetail.table_number || `Masa ${orderDetail.table_id}`,
            // İşlenmiş öğeler
            items: (orderDetail.items || []).map(item => {
              const safeItem = { ...item };

              // Ürün adı kontrolü
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }

              // Seçenekler kontrolü
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
            })
          };

          // Güncellenmiş sipariş detaylarını ayarla
          setSelectedOrder(processedOrder);
          setLoading(false);
          return;
        }
      } catch (orderDetailError) {
        console.warn('getOrderById ile sipariş detayları alınamadı:', orderDetailError);
      }

      // Buraya kadar geldiyse orderDetail alınamadı demektir, mevcut order ile devam et
      // Sipariş için items kısmı yoksa veya boşsa dolduralım
      const processedOrder = { ...order };

      if (!processedOrder.items || processedOrder.items.length === 0) {
        console.log('Sipariş için kalemler alternatif yolla yükleniyor:', order.id);
        try {
          const items = await orderService.getOrderItems(order.id);

          if (items && items.length > 0) {
            console.log('Alternatif: API\'den sipariş öğeleri yüklendi:', items);
            processedOrder.items = items.map(item => {
              const safeItem = { ...item };

              // Ürün adı kontrolü
              if (!safeItem.product_name || safeItem.product_name.trim() === '') {
                safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
              }

              // Seçenekler kontrolü
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

        // Mevcut öğelerin güvenliğini kontrol et
        processedOrder.items = (processedOrder.items || []).map(item => {
          const safeItem = { ...item };

          // Ürün adı kontrolü
          if (!safeItem.product_name || safeItem.product_name.trim() === '') {
            safeItem.product_name = `Ürün #${safeItem.product_id || 'Bilinmeyen'}`;
          }

          // Seçenekler kontrolü
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

      // Table_number yoksa doldur
      if (!processedOrder.table_number) {
        processedOrder.table_number = `Masa ${processedOrder.table_id}`;
      }

      // Güncellenmiş sipariş detaylarını ayarla
      setSelectedOrder(processedOrder);

    } catch (error) {
      console.error('Sipariş detayları yüklenirken hata oluştu:', error);
      setError('Sipariş detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
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

  // Sipariş durumunu Türkçe olarak göster
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

  // Sipariş durumuna göre renk sınıfı
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

  // Tarih formatı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Siparişler</h1>
        <div className="flex space-x-2">
          <select
            className="rounded-md border-gray-300 px-4 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Siparişler Tablosu */}
      {loading && <p className="text-center text-gray-500">Yükleniyor...</p>}

      {!loading && orders.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center shadow-md">
          <p className="text-gray-500">Sipariş bulunamadı.</p>
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
              {orders.map((order) => (
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
      )}

      {/* Sipariş Detay Modal */}
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
