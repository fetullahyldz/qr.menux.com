import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { orderService, tableService } from '../services';
import type { ICartItem, ITable } from '../types';

// Cart utils
const getCart = (): ICartItem[] => {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
};

const saveCart = (items: ICartItem[]) => {
  localStorage.setItem('cart', JSON.stringify(items));
  // Özel olay tetikle (Header bileşeninin dinleyebilmesi için)
  window.dispatchEvent(new Event('cartUpdated'));
};

const clearCart = () => {
  localStorage.removeItem('cart');
  // Özel olay tetikle (Header bileşeninin dinleyebilmesi için)
  window.dispatchEvent(new Event('cartUpdated'));
};

// Sipariş tipleri
type OrderType = 'table' | 'takeaway';

const CartPage = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<ICartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [tables, setTables] = useState<ITable[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('table');
  // Paket sipariş için ek alanlar
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Load cart items from localStorage
  useEffect(() => {
    setCartItems(getCart());
  }, []);

  // Load available tables
  useEffect(() => {
    const loadTables = async () => {
      try {
        const tablesData = await tableService.getTables({
          is_active: true,
          status: 'available'
        });
        setTables(tablesData);
      } catch (error) {
        console.error('Error loading tables:', error);
      }
    };

    if (isModalOpen && orderType === 'table') {
      loadTables();
    }
  }, [isModalOpen, orderType]);

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      const updatedCart = cartItems.filter((item) => item.product_id !== productId);
      setCartItems(updatedCart);
      saveCart(updatedCart);

      if (updatedCart.length === 0) {
        toast.error('Sepetiniz boşaltıldı');
      } else {
        toast.success('Ürün sepetten kaldırıldı');
      }
    } else {
      const updatedCart = cartItems.map((item) =>
        item.product_id === productId ? { ...item, quantity: newQuantity } : item
      );
      setCartItems(updatedCart);
      saveCart(updatedCart);
      toast.success('Ürün miktarı güncellendi');
    }
  };

  const calculateItemTotal = (item: ICartItem): number => {
    // Calculate base price
    let total = item.price * item.quantity;

    // Add option modifiers
    if (item.options && item.options.length > 0) {
      const optionsTotal = item.options.reduce(
        (sum, option) => sum + option.price_modifier,
        0
      );
      total += optionsTotal * item.quantity;
    }

    return total;
  };

  const calculateTotal = (): number => {
    return cartItems.reduce(
      (total, item) => total + calculateItemTotal(item),
      0
    );
  };

  const validateForm = (): boolean => {
    if (orderType === 'table') {
      if (!selectedTable && !tableNumber) {
        toast.error('Lütfen masa seçin veya masa numarası girin');
        return false;
      }
    } else if (orderType === 'takeaway') {
      if (!customerName.trim()) {
        toast.error('Lütfen adınızı girin');
        return false;
      }
      if (!customerPhone.trim()) {
        toast.error('Lütfen telefon numaranızı girin');
        return false;
      }
      if (!customerAddress.trim()) {
        toast.error('Lütfen adresinizi girin');
        return false;
      }
    }
    return true;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create order items from cart
      const orderItems = cartItems.map(item => {
        console.log(`İşlenen sepet öğesi:`, item);

        // Temel öğe verilerini hazırla
        const orderItem = {
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          special_instructions: item.special_instructions,
          options: [] as any[]
        };

        // Eğer öğenin seçenekleri varsa, bunları düzgün şekilde ekle
        if (item.options && item.options.length > 0) {
          console.log(`Ürün ${item.product_id} için ${item.options.length} seçenek var:`, item.options);

          // Hata ayıklama: tüm seçenek veri yapısını görelim
          item.options.forEach((opt, index) => {
            console.log(`Seçenek ${index + 1}:`, JSON.stringify(opt));
          });

          // Geçerli seçenekleri filtrele ve dönüştür
          orderItem.options = item.options
            // Seçenekleri uygun şekilde filtrele - ID'ye veya ada sahip tüm geçerli seçenekleri dahil et
            .filter(opt => {
              const isValid = opt && (
                (typeof opt.product_option_id === 'number' && opt.product_option_id > 0) ||
                (typeof opt.name === 'string' && opt.name.trim() !== '')
              );

              if (!isValid) {
                console.warn('Geçersiz seçenek bulundu ve atlandı:', opt);
              }

              return isValid;
            })
            .map(opt => {
              console.log(`Seçenek işleniyor:`, opt);

              // Daha sağlam dönüşüm - tüm gerekli alanlar var mı?
              return {
                product_option_id: typeof opt.product_option_id === 'number' ? opt.product_option_id : 0,
                price: typeof opt.price_modifier === 'number' ? opt.price_modifier : 0,
                // Eğer API için product_option_name gerekiyorsa ekleyelim
                product_option_name: opt.name || `Seçenek #${opt.product_option_id || '?'}`
              };
            });

          console.log(`Toplam ${orderItem.options.length} geçerli seçenek işlendi:`, orderItem.options);
        } else {
          console.log(`Ürün ${item.product_id} için seçenek bulunmuyor.`);
        }

        return orderItem;
      });

      let tableId = null;

      // Masa siparişi için masa ID'si al
      if (orderType === 'table') {
        // Use selected table ID or find table by number
        tableId = selectedTable;

        if (!tableId && tableNumber) {
          // Try to find table by number
          const table = tables.find(t => t.table_number === tableNumber);
          tableId = table?.id || null;

          // If table not found, create a temporary one
          if (!tableId) {
            try {
              const newTable = await tableService.createTable({
                table_number: tableNumber,
                is_active: true,
                status: 'available'
              });
              if (newTable) {
                tableId = newTable.id;
              }
            } catch (error) {
              console.error('Error creating table:', error);
            }
          }
        }

        if (!tableId) {
          toast.error('Geçersiz masa numarası');
          setLoading(false);
          return;
        }
      }

      // Siparişi hazırla
      const newOrder = {
        table_id: tableId,
        status: 'new',
        items: orderItems,
        total_amount: calculateTotal(),
        customer_name: customerName || undefined,
        special_instructions: customerNotes || undefined,
        order_type: orderType,
        customer_phone: orderType === 'takeaway' ? customerPhone : undefined,
        customer_address: orderType === 'takeaway' ? customerAddress : undefined
      };

      // Send order to the server
      const result = await orderService.createOrder(newOrder);

      if (result) {
        // Mark order as successful
        setOrderSuccess(true);

        // Masa siparişi için masayı dolu olarak işaretle
        if (orderType === 'table' && tableId) {
          await tableService.updateTableStatus(tableId, 'occupied');
        }

        // Clear cart after successful order
        setTimeout(() => {
          clearCart();
          setCartItems([]);
          setIsModalOpen(false);
          setOrderSuccess(false);
          setCustomerName('');
          setCustomerNotes('');
          setCustomerPhone('');
          setCustomerAddress('');

          // Redirect to menu with success message
          navigate('/menu');
          toast.success('Siparişiniz başarıyla alındı!');
        }, 2000);
      } else {
        toast.error('Sipariş gönderilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      toast.error('Siparişiniz oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 md:text-3xl">
          Sepetim
        </h1>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-md">
            <svg
              className="mb-4 h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mb-4 text-lg text-gray-600">Sepetiniz boş</p>
            <Link
              to="/menu"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary-dark"
            >
              Menüye Dön
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-6 flow-root">
              <ul className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <li key={`${item.product_id}-${item.options?.map(o => o.product_option_id).join('-') || ''}`} className="py-4">
                    <div className="flex items-start">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={item.image_url || `https://via.placeholder.com/80?text=${encodeURIComponent(item.name)}`}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>

                      <div className="ml-4 flex flex-1 flex-col">
                        <div className="flex justify-between text-base font-medium text-gray-800">
                          <h3>{item.name}</h3>
                          <p className="ml-4">{calculateItemTotal(item).toFixed(2)} ₺</p>
                        </div>

                        {/* Options */}
                        {item.options && item.options.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">Seçenekler:</p>
                            <ul className="mt-1 space-y-1">
                              {item.options.map((option) => (
                                <li key={`option-${option.product_option_id || option.name}`} className="flex justify-between text-xs text-gray-600">
                                  <span>{option.name}</span>
                                  {option.price_modifier > 0 && (
                                    <span>+{option.price_modifier.toFixed(2)} ₺</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Special Instructions */}
                        {item.special_instructions && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500">Özel istek:</p>
                            <p className="text-xs text-gray-600">{item.special_instructions}</p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center rounded border border-gray-300">
                            <button
                              type="button"
                              className="px-3 py-1 text-gray-600 hover:text-primary"
                              onClick={() =>
                                updateQuantity(item.product_id, item.quantity - 1)
                              }
                            >
                              -
                            </button>
                            <span className="px-3 py-1">{item.quantity}</span>
                            <button
                              type="button"
                              className="px-3 py-1 text-gray-600 hover:text-primary"
                              onClick={() =>
                                updateQuantity(item.product_id, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => updateQuantity(item.product_id, 0)}
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-base font-medium text-gray-800">
                <p>Toplam</p>
                <p>{calculateTotal().toFixed(2)} ₺</p>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">Vergiler dahildir.</p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="w-full rounded-md bg-primary px-6 py-3 text-center text-base font-medium text-white hover:bg-primary-dark"
                onClick={() => setIsModalOpen(true)}
              >
                Sipariş Ver
              </button>
              <div className="mt-4 flex justify-between">
                <Link
                  to="/menu"
                  className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                  &larr; Alışverişe Devam Et
                </Link>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                  onClick={() => {
                    if (window.confirm('Sepetinizi boşaltmak istediğinize emin misiniz?')) {
                      clearCart();
                      setCartItems([]);
                      toast.success('Sepetiniz boşaltıldı');
                    }
                  }}
                >
                  Sepeti Boşalt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sipariş Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
          <div className="relative max-w-md w-full rounded-lg bg-white p-6 shadow-xl">
            {orderSuccess ? (
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
                <h3 className="text-lg font-medium text-gray-800">
                  Sipariş başarıyla alındı
                </h3>
                <p className="mt-2 text-gray-600">
                  Siparişiniz en kısa sürede hazırlanacak.
                </p>
              </div>
            ) : (
              <>
                <button
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                  onClick={() => setIsModalOpen(false)}
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
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  Sipariş Bilgileri
                </h3>
                <form onSubmit={handleSubmitOrder}>
                  {/* Sipariş Tipi Seçimi */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Sipariş Tipi
                    </label>
                    <div className="flex space-x-4">
                      <div
                        className={`flex-1 cursor-pointer rounded-md border p-3 ${
                          orderType === 'table'
                            ? 'border-primary bg-primary-50 text-primary'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setOrderType('table')}
                      >
                        <div className="flex items-center">
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 5H20M4 5V19M4 5L8 9M20 5V19M20 5L16 9M4 19H20M4 19L8 15M20 19L16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Masa Siparişi</span>
                        </div>
                      </div>
                      <div
                        className={`flex-1 cursor-pointer rounded-md border p-3 ${
                          orderType === 'takeaway'
                            ? 'border-primary bg-primary-50 text-primary'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => setOrderType('takeaway')}
                      >
                        <div className="flex items-center">
                          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 10H5M19 10C19.5304 10 20.0391 10.2107 20.4142 10.5858C20.7893 10.9609 21 11.4696 21 12V18C21 18.5304 20.7893 19.0391 20.4142 19.4142C20.0391 19.7893 19.5304 20 19 20H5C4.46957 20 3.96086 19.7893 3.58579 19.4142C3.21071 19.0391 3 18.5304 3 18V12C3 11.4696 3.21071 10.9609 3.58579 10.5858C3.96086 10.2107 4.46957 10 5 10M19 10V8C19 6.93913 18.5786 5.92172 17.8284 5.17157C17.0783 4.42143 16.0609 4 15 4H9C7.93913 4 6.92172 4.42143 6.17157 5.17157C5.42143 5.92172 5 6.93913 5 8V10M8 14V16M16 14V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Paket Sipariş</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {orderType === 'takeaway' ? 'Adınız Soyadınız *' : 'Adınız'}
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={orderType === 'takeaway' ? 'Ad Soyad (zorunlu)' : 'Opsiyonel'}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required={orderType === 'takeaway'}
                    />
                  </div>

                  {/* Paket Sipariş için Ek Alanlar */}
                  {orderType === 'takeaway' && (
                    <>
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Telefon Numaranız *
                        </label>
                        <input
                          type="tel"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="05XX XXX XX XX"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Adresiniz *
                        </label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Açık adresinizi giriniz"
                          rows={3}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Masa Siparişi için Masa Alanları */}
                  {orderType === 'table' && (
                    <>
                      {tables.length > 0 && (
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Listelenen Masalar
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={selectedTable || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedTable(value ? Number(value) : null);
                              // Eğer bir masa seçildiyse, masa numarası alanını temizle
                              if (value) setTableNumber('');
                            }}
                          >
                            <option value="">Masa seçin</option>
                            {tables.map((table) => (
                              <option key={table.id} value={table.id}>
                                Masa {table.table_number}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="mb-1 flex items-center">
                          <label className="block text-sm font-medium text-gray-700">
                            Veya Masa Numarası Girin
                          </label>
                          <span className="ml-1 text-xs text-gray-500">{selectedTable ? '(Seçili masa varken kullanılmaz)' : '(Masa seçmek gerekli)'}</span>
                        </div>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Masa numaranızı giriniz"
                          value={tableNumber}
                          onChange={(e) => {
                            setTableNumber(e.target.value);
                            // Masa numarası girilirse, seçili masayı temizle
                            if (e.target.value) setSelectedTable(null);
                          }}
                          disabled={!!selectedTable}
                        />
                      </div>
                    </>
                  )}

                  {/* Special Instructions */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Özel Notlar
                    </label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Siparişiniz ile ilgili eklemek istediğiniz notlar"
                      rows={3}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    />
                  </div>

                  {/* Order Summary */}
                  <div className="mb-4 rounded-md bg-gray-50 p-3">
                    <h4 className="mb-2 font-medium text-gray-700">Sipariş Özeti</h4>
                    <div className="text-sm text-gray-600">
                      <p>{cartItems.length} Ürün</p>
                      <p className="font-semibold mt-1">Toplam: {calculateTotal().toFixed(2)} ₺</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      className="mr-2 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsModalOpen(false)}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                      disabled={loading}
                    >
                      {loading ? 'Gönderiliyor...' : 'Siparişi Gönder'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
