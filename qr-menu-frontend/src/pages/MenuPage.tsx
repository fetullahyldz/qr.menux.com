import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { categoryService, productService } from '../services';
import type { ICategory, IProduct, IProductOption, ICartItem } from '../types';

// Cart context kullanılana kadar localStorage'da saklayacağız
const saveCart = (items: ICartItem[]) => {
  console.log('Sepet kaydetme fonksiyonu çağrıldı, öğeler:', items);
  try {
    localStorage.setItem('cart', JSON.stringify(items));
    console.log('Sepet localStorage\'a kaydedildi');
    // Özel olay tetikle (Header bileşeninin dinleyebilmesi için)
    window.dispatchEvent(new Event('cartUpdated'));
    console.log('cartUpdated olayı tetiklendi');
  } catch (error) {
    console.error('Sepet kaydedilirken hata oluştu:', error);
  }
};

const getCart = (): ICartItem[] => {
  console.log('getCart fonksiyonu çağrıldı');
  try {
    const cart = localStorage.getItem('cart');
    console.log('localStorage\'dan okunan sepet:', cart);

    if (!cart) {
      console.log('Sepet boş, boş dizi döndürülüyor');
      return [];
    }

    const parsedCart = JSON.parse(cart);
    console.log('Ayrıştırılmış sepet verileri:', parsedCart);
    return parsedCart;
  } catch (error) {
    console.error('Sepet verileri alınırken hata oluştu:', error);
    return [];
  }
};

const MenuPage = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<ICartItem[]>(getCart());

  // Seçili seçenekler
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    // Kategorileri yükle
    const loadCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await categoryService.getCategories({ is_active: true });
        setCategories(categoriesData);

        if (categoriesData.length > 0 && !selectedCategory) {
          setSelectedCategory(categoriesData[0].id);
        }
      } catch (error) {
        console.error('Kategoriler yüklenirken hata oluştu:', error);
        toast.error('Kategoriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    // Ürünleri yükle
    const loadProducts = async () => {
      if (selectedCategory) {
        try {
          setLoading(true);
          const productsData = await productService.getProducts({
            category_id: selectedCategory,
            is_active: true
          });
          setProducts(productsData);
        } catch (error) {
          console.error('Ürünler yüklenirken hata oluştu:', error);
          toast.error('Ürünler yüklenirken bir hata oluştu');
        } finally {
          setLoading(false);
        }
      }
    };

    loadProducts();
  }, [selectedCategory]);

  // Ürün detaylarını yükle
  const loadProductDetails = async (productId: number) => {
    try {
      console.log(`Ürün detayları yükleniyor: ID = ${productId}`);
      setLoading(true);

      const product = await productService.getProductById(productId);
      console.log('API\'den alınan ürün:', product);
      console.log('Ürün seçenekleri mevcut mu:', product?.options ? 'Evet' : 'Hayır');
      if (product?.options) {
        console.log('Seçenekler dizisi mi:', Array.isArray(product.options));
        console.log('Seçenek sayısı:', product.options.length);
        console.log('Seçeneklerin içeriği:', JSON.stringify(product.options, null, 2));
      }

      if (product) {
        // Seçenekleri sıfırla ve ürünü ayarla
        setSelectedOptions([]);
        setQuantity(1);
        setSpecialInstructions('');
        setSelectedProduct(product);

        // Bu kısım kritik - product.options kontrolü
        if (!product.options || !Array.isArray(product.options)) {
          console.log('Ürün seçenekleri bulunamadı veya geçerli bir dizi değil, seçenekler yükleniyor...');
          try {
            const options = await productService.getProductOptions(productId);
            console.log('Manuel olarak yüklenen seçenekler:', options);
            console.log('Seçenek verisi türü:', typeof options);
            console.log('Seçenek dizisi mi:', Array.isArray(options));
            console.log('Seçenek sayısı:', options?.length || 0);

            // Seçenekleri ile birlikte ürünü güncelle
            if (options && options.length > 0) {
              setSelectedProduct(prev => {
                const updated = prev ? { ...prev, options } : null;
                console.log('Güncellenmiş ürün:', updated);
                return updated;
              });
            }
          } catch (optionsError) {
            console.error('Seçenekler yüklenirken hata:', optionsError);
          }
        } else {
          console.log('Ürün zaten seçeneklere sahip:', product.options.length);
        }
      } else {
        toast.error('Ürün detayları bulunamadı');
      }
    } catch (error) {
      console.error('Ürün detayları yüklenirken hata oluştu:', error);
      toast.error('Ürün detayları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Seçili ürün değiştiğinde seçenekleri yükle
  useEffect(() => {
    const loadProductOptions = async () => {
      if (selectedProduct && selectedProduct.id) {
        try {
          console.log(`Ürün ${selectedProduct.id} için seçenekler yükleniyor...`);
          const options = await productService.getProductOptions(selectedProduct.id);

          if (options && options.length > 0) {
            console.log(`${options.length} seçenek bulundu:`, options);
            // Mevcut seçeneklere sahipse, sadece güncelle
            if (selectedProduct.options && selectedProduct.options.length > 0) {
              console.log('Ürün zaten seçeneklere sahip. Güncelleniyor...');
            } else {
              console.log('Ürüne yeni seçenekler ekleniyor...');
            }

            setSelectedProduct(prev => prev ? { ...prev, options } : null);
          } else {
            console.log('Bu ürün için seçenek bulunamadı');

            // Eğer API'den seçenek gelmedi ama ürün zaten seçeneklere sahipse koruyalım
            if (!selectedProduct.options || selectedProduct.options.length === 0) {
              console.log('Ürünün hiç seçeneği yok. Bu normal olabilir.');
            }
          }
        } catch (error) {
          console.error('Ürün seçenekleri yüklenirken hata oluştu:', error);
        }
      }
    };

    if (selectedProduct) {
      loadProductOptions();
    }
  }, [selectedProduct?.id]);

  // Ürün seçeneği seç/kaldır
  const toggleProductOption = (optionId: number) => {
    console.log(`Toggle option ${optionId}, current selectedOptions:`, selectedOptions);
    console.log('Ürün seçenekleri:', selectedProduct?.options);

    const option = selectedProduct?.options?.find(o => o.id === optionId);
    console.log('Seçilen seçenek:', option);

    if (selectedOptions.includes(optionId)) {
      console.log(`Removing option ${optionId}`);
      setSelectedOptions(selectedOptions.filter(id => id !== optionId));
    } else {
      console.log(`Adding option ${optionId}`);
      setSelectedOptions([...selectedOptions, optionId]);
    }

    // Yeni fiyatı loglama (state güncellendikten sonra hesaplanacak)
    setTimeout(() => {
      const optionsPrice = getOptionsPrice();
      console.log(`Updated options price: ${optionsPrice}`);
    }, 0);
  };

  // Toplam ürün fiyatını hesapla (temel fiyat + seçenekler)
  const calculateTotalPrice = (): number => {
    if (!selectedProduct) return 0;

    console.log('Fiyat hesaplanıyor...');

    // Temel fiyatı güvenli şekilde al
    const basePrice = typeof selectedProduct.price === 'number'
      ? selectedProduct.price
      : typeof selectedProduct.price === 'string'
        ? Number.parseFloat(selectedProduct.price) || 0
        : 0;

    console.log('Temel fiyat:', basePrice);

    // Seçeneklerin fiyatını hesapla
    let optionsPrice = 0;

    // selectedProduct.options'ın varlığını ve geçerli bir dizi olduğunu kontrol et
    if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
      // Seçili seçenekleri filtrele
      const selectedProductOptions = selectedProduct.options.filter(
        option => selectedOptions.includes(option.id)
      );

      // Seçeneklerin fiyat modifikatörlerini topla
      optionsPrice = selectedProductOptions.reduce((total, option) => {
        // price_modifier değerini güvenli bir şekilde handle et
        const priceModifier = typeof option.price_modifier === 'number'
          ? option.price_modifier
          : typeof option.price_modifier === 'string'
            ? Number.parseFloat(option.price_modifier) || 0
            : 0;

        console.log(`Seçenek "${option.name}" fiyat düzenleyici:`, priceModifier);
        return total + priceModifier;
      }, 0);
    } else {
      console.warn('Ürün seçenekleri bulunamadı veya geçerli değil');
    }

    console.log('Seçenekler fiyatı:', optionsPrice);

    const totalPrice = basePrice + optionsPrice;
    console.log(`Toplam fiyat: ${basePrice} (temel) + ${optionsPrice} (seçenekler) = ${totalPrice}`);

    return totalPrice;
  };

  // Sepete ürün ekleme fonksiyonu
  const addToCart = () => {
    if (!selectedProduct) {
      console.error('Sepete eklenecek ürün bulunamadı!');
      return;
    }

    console.log('Sepete eklenecek ürün:', selectedProduct);
    console.log('Seçili seçenekler:', selectedOptions);
    console.log('Ürün adeti:', quantity);

    try {
      // Seçilen seçenekleri al
      let selectedProductOptions: Array<{
        product_option_id: number;
        name: string;
        price_modifier: number;
      }> = [];

      // Ürün seçeneklerinin varlığını kontrol et
      if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
        console.log('Ürün seçenekleri bulundu, işleniyor...');
        console.log('Tüm mevcut seçenekler:', selectedProduct.options);
        console.log('Kullanıcı tarafından seçilenler:', selectedOptions);

        if (selectedOptions.length === 0) {
          console.log('Kullanıcı hiçbir seçenek seçmedi.');
        } else {
          selectedProductOptions = selectedProduct.options
            .filter(option => {
              const isSelected = selectedOptions.includes(option.id);
              console.log(`Seçenek ${option.id} - ${option.name} seçildi mi?`, isSelected ? 'Evet' : 'Hayır');
              return isSelected;
            })
            .map(option => {
              console.log('İşlenen seçenek:', option);

              const processedOption = {
                product_option_id: option.id,
                name: option.name,
                price_modifier: typeof option.price_modifier === 'number'
                  ? option.price_modifier
                  : typeof option.price_modifier === 'string'
                    ? Number.parseFloat(option.price_modifier)
                    : 0
              };

              console.log('İşlenmiş seçenek:', processedOption);
              return processedOption;
            });
        }

        console.log('Toplam işlenmiş seçenek sayısı:', selectedProductOptions.length);
        console.log('İşlenmiş seçenekler:', JSON.stringify(selectedProductOptions, null, 2));
      } else {
        console.warn('Ürünün seçenekleri bulunamadı veya geçerli bir dizi değil');
      }

      // Yeni sepet ürünü oluştur
      const newCartItem: ICartItem = {
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: quantity,
        image_url: selectedProduct.image_url,
        special_instructions: specialInstructions,
        options: selectedProductOptions
      };

      console.log('Oluşturulan sepet öğesi:', newCartItem);

      // Sepete ekle
      const updatedCart = [...cartItems, newCartItem];
      console.log('Güncellenmiş sepet:', updatedCart);

      setCartItems(updatedCart);
      saveCart(updatedCart);

      // Modal'ı kapat
      setSelectedProduct(null);

      // Bildirim göster
      toast.success(
        <div className="flex items-center">
          <span className="mr-2 font-medium">{selectedProduct.name}</span> sepete eklendi
        </div>,
        {
          icon: '🛒',
          duration: 2000,
          position: 'top-right',
          className: 'bg-white',
        }
      );
    } catch (error) {
      console.error('Sepete ekleme sırasında hata oluştu:', error);
      toast.error('Ürün sepete eklenirken bir hata oluştu.');
    }
  };

  // Helper to get options price (used in toggleProductOption for logging)
  const getOptionsPrice = (): number => {
    if (!selectedProduct) return 0;

    let optionsPrice = 0;
    if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
      const selectedProductOptions = selectedProduct.options.filter(option => selectedOptions.includes(option.id));
      optionsPrice = selectedProductOptions.reduce((total, option) => {
        const priceModifier = typeof option.price_modifier === 'number'
          ? option.price_modifier
          : typeof option.price_modifier === 'string'
            ? Number.parseFloat(option.price_modifier) || 0
            : 0;
        return total + priceModifier;
      }, 0);
    }
    return optionsPrice;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Menü</h1>
        <Link
          to="/cart"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-white"
        >
          <svg
            className="mr-2 h-5 w-5"
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
          Sepet {cartItems.length > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 text-xs">{cartItems.reduce((total, item) => total + item.quantity, 0)}</span>}
        </Link>
      </div>

      {/* Kategori Seçimi */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`mr-4 whitespace-nowrap rounded px-4 py-2 font-medium transition ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <>
          {products.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-md">
              <p className="text-gray-500">Bu kategoride ürün bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-105"
                  onClick={() => loadProductDetails(product.id)}
                >
                  <div className="relative h-40">
                    <img
                      src={product.image_url || `https://via.placeholder.com/300?text=${encodeURIComponent(product.name)}`}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                    {product.options && product.options.length > 0 && (
                      <div className="absolute bottom-2 right-2 rounded-full bg-primary px-2 py-1 text-xs text-white">
                        {product.options.length} seçenek
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 text-lg font-medium text-gray-800">
                      {product.name}
                    </h3>
                    <p className="mb-2 text-sm text-gray-600 line-clamp-2">
                      {product.description || 'Bu ürün için açıklama bulunmamaktadır.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-primary">
                        {typeof product.price === 'number'
                          ? product.price.toFixed(2)
                          : typeof product.price === 'string'
                            ? Number.parseFloat(product.price).toFixed(2)
                            : '0.00'} ₺
                      </span>
                      <button
                        className="rounded-full bg-primary p-2 text-white hover:bg-primary-dark"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadProductDetails(product.id);
                        }}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Ürün Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center overflow-y-auto bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg">
            <div className="relative h-56">
              <img
                src={selectedProduct.image_url || `https://via.placeholder.com/600x400?text=${encodeURIComponent(selectedProduct.name)}`}
                alt={selectedProduct.name}
                className="h-full w-full object-cover"
              />
              <button
                className="absolute right-2 top-2 rounded-full bg-white p-2 text-gray-800 shadow-md hover:bg-gray-100"
                onClick={() => setSelectedProduct(null)}
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
            </div>

            <div className="p-4">
              <h3 className="mb-2 text-xl font-semibold text-gray-800">{selectedProduct.name}</h3>
              <p className="mb-4 text-gray-600">{selectedProduct.description}</p>

              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-800">Fiyat:</span>
                  <span className="text-xl font-semibold text-primary">
                    {calculateTotalPrice().toFixed(2)} ₺
                  </span>
                </div>
              </div>

              {selectedProduct.options && selectedProduct.options.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 font-medium text-gray-800">Seçenekler</h4>
                  <div className="space-y-2">
                    {selectedProduct.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`option-${option.id}`}
                            checked={selectedOptions.includes(option.id)}
                            onChange={() => toggleProductOption(option.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`option-${option.id}`} className="ml-2 block text-sm font-medium text-gray-700">
                            {option.name}
                          </label>
                        </div>
                        {option.price_modifier > 0 && (
                          <span className="text-sm font-medium text-gray-700">
                            +{Number.parseFloat(String(option.price_modifier)).toFixed(2)} ₺
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="quantity" className="block font-medium text-gray-800">
                  Adet
                </label>
                <div className="mt-1 flex items-center">
                  <button
                    className="h-10 w-10 rounded-l-md border border-r-0 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                    className="h-10 w-20 border text-center"
                  />
                  <button
                    className="h-10 w-10 rounded-r-md border border-l-0 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="instructions" className="block font-medium text-gray-800">
                  Özel İstekler (İsteğe Bağlı)
                </label>
                <textarea
                  id="instructions"
                  rows={2}
                  placeholder="Özel isteklerinizi buraya yazabilirsiniz..."
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              <div className="flex justify-between">
                <button
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => setSelectedProduct(null)}
                >
                  İptal
                </button>
                <button
                  className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
                  onClick={addToCart}
                >
                  Sepete Ekle - {
                    (() => {
                      const total = calculateTotalPrice() * quantity;
                      return total.toFixed(2);
                    })()
                  } ₺
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
