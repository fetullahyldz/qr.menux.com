import type React from 'react';
import { useState, useEffect } from 'react';
import { productService, categoryService } from '../../services';
import type { IProduct, ICategory, IProductOption } from '../../types';

// Ürün seçenekleri için bileşen
const ProductOptionForm = ({
  options,
  setOptions,
  productId
}: {
  options: IProductOption[];
  setOptions: React.Dispatch<React.SetStateAction<IProductOption[]>>;
  productId?: number;
}) => {
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState<number | string>(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddOption = () => {
    if (!name.trim()) return;

    const tempId = -Math.floor(Math.random() * 1000);

    let numericPrice = 0;
    if (typeof priceModifier === 'number') {
      numericPrice = priceModifier;
    } else {
      const parsed = Number.parseFloat(priceModifier);
      if (!isNaN(parsed)) {
        numericPrice = parsed;
      }
    }

    setOptions([
      ...options,
      {
        id: tempId,
        product_id: productId || 0,
        name,
        price_modifier: numericPrice,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setName('');
    setPriceModifier(0);
  };

  const handleRemoveOption = async (id: number) => {
    if (isDeleting) return;

    if (productId && id > 0) {
      try {
        setIsDeleting(true);
        if (window.confirm('Bu seçeneği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
          console.log(`Deleting option with ID: ${id} from database`);
          const success = await productService.deleteProductOption(id);

          if (success) {
            console.log(`Option with ID: ${id} successfully deleted from database`);
            setOptions(options.filter((option) => option.id !== id));
          } else {
            console.error(`Failed to delete option with ID: ${id} from database`);
            alert('Seçenek silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
          }
        }
      } catch (error) {
        console.error('Error deleting product option:', error);
        alert('Seçenek silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setIsDeleting(false);
      }
    } else {
      console.log(`Removing temporary option with ID: ${id} from UI only`);
      setOptions(options.filter((option) => option.id !== id));
    }
  };

  const handleOptionChange = (index: number, field: 'name' | 'price_modifier', value: string | number) => {
    const updatedOptions = [...options];
    const option = updatedOptions[index];

    if (!option) return;

    const updatedOption = { ...option };
    if (field === 'name') {
      updatedOption.name = value as string;
    } else if (field === 'price_modifier') {
      updatedOption.price_modifier = typeof value === 'number' ? value : Number.parseFloat(value) || 0;
    }
    updatedOption.updated_at = new Date().toISOString();

    updatedOptions[index] = updatedOption;
    setOptions(updatedOptions);
  };

  return (
    <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-4 text-lg font-medium">Ürün Seçenekleri</h3>

      {options.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Seçenek Adı
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Fiyat Farkı
                </th>
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {options.map((option, index) => (
                <tr key={option.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <input
                      type="number"
                      value={option.price_modifier}
                      onChange={(e) => handleOptionChange(index, 'price_modifier', e.target.value)}
                      className="w-full border rounded p-1"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isDeleting}
                    >
                      {isDeleting && option.id > 0 ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="optionName" className="mb-1 block text-sm font-medium text-gray-700">
            Seçenek Adı
          </label>
          <input
            type="text"
            id="optionName"
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seçenek adı (ör: Ekstra Peynir)"
          />
        </div>
        <div>
          <label htmlFor="priceModifier" className="mb-1 block text-sm font-medium text-gray-700">
            Fiyat Farkı (₺)
          </label>
          <input
            type="number"
            id="priceModifier"
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            step="0.01"
            min="0"
            placeholder="Fiyat farkı"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAddOption}
        className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
      >
        Seçenek Ekle
      </button>
    </div>
  );
};

// Ürün form bileşeni
const ProductForm = ({
  product,
  categories,
  onSubmit,
  onCancel,
}: {
  product?: IProduct;
  categories: ICategory[];
  onSubmit: (productData: Partial<IProduct>, imageFile?: File) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState<number | undefined>(product?.category_id);
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [isActive, setIsActive] = useState(product?.is_active !== false);
  const [sortOrder, setSortOrder] = useState(product?.sort_order || 0);
  const [duration, setDuration] = useState(product?.duration || 0);
  const [options, setOptions] = useState<IProductOption[]>(product?.options || []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (!imagePreview && !imageFile && product?.image_url) {
      setImagePreview(product.image_url);
    }
  }, [product]);

  useEffect(() => {
    if (product?.options) {
      console.log('Updating options in form from product:', product.options);
      setOptions(product.options || []);
    } else {
      console.log('No product provided, resetting options state');
      setOptions([]);
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Sending options with product form submission:', options);

    const cleanedOptions = options.filter(option => option !== null && option !== undefined);
    const validOptions = cleanedOptions.map(option => ({
      ...option,
      price_modifier: typeof option.price_modifier === 'number'
        ? option.price_modifier
        : Number.parseFloat(String(option.price_modifier || 0)) || 0
    }));

    onSubmit({
      name,
      category_id: categoryId,
      description,
      price,
      image_url: imageUrl,
      is_active: isActive,
      sort_order: sortOrder,
      duration,
      options: validOptions,
    }, imageFile || undefined);

    // Form gönderildikten sonra state’i sıfırla
    setOptions([]);
    setName('');
    setPrice(0);
    setDescription('');
    setImageUrl('');
    setImageFile(null);
    setImagePreview('');
    setCategoryId(undefined);
    setIsActive(true);
    setSortOrder(0);
    setDuration(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result.toString());
          setImageUrl('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    if (url) {
      setImageFile(null);
      setImagePreview('');
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block font-medium text-gray-700">
              Ürün Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="category" className="mb-1 block font-medium text-gray-700">
              Kategori
            </label>
            <select
              id="category"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Kategori Seçin</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="price" className="mb-1 block font-medium text-gray-700">
              Fiyat <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="price"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="sortOrder" className="mb-1 block font-medium text-gray-700">
              Sıralama
            </label>
            <input
              type="number"
              id="sortOrder"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number.parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="duration" className="mb-1 block font-medium text-gray-700">
              Hazırlanma Süresi
            </label>
            <input
              type="number"
              id="duration"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={duration}
              onChange={(e) => setDuration(Number.parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="mb-4 flex items-center pt-6">
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
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="mb-1 block font-medium text-gray-700">
            Açıklama
          </label>
          <textarea
            id="description"
            className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block font-medium text-gray-700">
            Ürün Görseli
          </label>

          <div className="mb-3">
            <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium text-gray-700">
              Görsel URL
            </label>
            <input
              type="text"
              id="imageUrl"
              className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              veya bilgisayarınızdan bir görsel seçin:
            </label>
            <input
              type="file"
              id="imageFile"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:rounded-md file:border-0
                file:bg-primary file:px-4 file:py-2
                file:text-sm file:font-semibold file:text-white
                hover:file:bg-primary-dark"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {(imagePreview || imageUrl) && (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-gray-600">Önizleme:</p>
              <img
                src={imagePreview || imageUrl}
                alt="Ürün Görseli Önizleme"
                className="h-32 w-32 rounded-md border border-gray-200 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Resim+Yok';
                }}
              />
            </div>
          )}
        </div>

        <ProductOptionForm options={options} setOptions={setOptions} productId={product?.id} />

        <div className="mt-6 flex justify-end space-x-2">
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
            {product ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const ProductsPage = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<IProduct | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const timestamp = new Date().getTime();

      console.log('Fetching categories from database...');
      const categoriesData = await categoryService.getCategories({
        _t: timestamp,
      });
      console.log('Categories fetched from database:', categoriesData);
      setCategories(categoriesData);

      const params: { category_id?: number; search?: string; _t?: number } = {
        _t: timestamp,
      };

      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory as number;
      }
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      console.log('Fetching products from database with params:', params);
      const productsData = await productService.getProducts(params);
      console.log('Products fetched from database:', productsData);

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else {
        console.error('Unexpected products data format:', productsData);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, debouncedSearchQuery]);

  const handleSubmit = async (productData: Partial<IProduct>, imageFile?: File) => {
    try {
      setLoading(true);
      setError('');

      const productDataToSend = { ...productData };

      if (typeof productDataToSend.price === 'string') {
        productDataToSend.price = Number.parseFloat(productDataToSend.price) || 0;
      }

      if (typeof productDataToSend.sort_order === 'string') {
        productDataToSend.sort_order = Number.parseInt(productDataToSend.sort_order) || 0;
      }

      if (productDataToSend.options && Array.isArray(productDataToSend.options)) {
        console.log('Form submission - original options:', productDataToSend.options);

        productDataToSend.options = productDataToSend.options.map(option => {
          if (typeof option.price_modifier === 'string') {
            const parsed = Number.parseFloat(option.price_modifier);
            return {
              ...option,
              price_modifier: !isNaN(parsed) ? parsed : 0
            };
          }
          return option;
        });

        console.log('Form submission - processed options:', productDataToSend.options);
      } else {
        console.warn('Form submission - no options found in product data');
        productDataToSend.options = [];
      }

      console.log('Sending product data to service:', productDataToSend);

      let result;
      if (currentProduct) {
        result = await productService.updateProduct(currentProduct.id, productDataToSend, imageFile);
        if (result) {
          setSuccessMessage('Ürün başarıyla güncellendi');
        } else {
          setError('Ürün güncellenirken bir hata oluştu');
          return;
        }
      } else {
        result = await productService.createProduct(productDataToSend, imageFile);
        if (result) {
          setSuccessMessage('Ürün başarıyla oluşturuldu');
        } else {
          setError('Ürün eklenirken bir hata oluştu');
          return;
        }
      }

      setShowForm(false);
      setCurrentProduct(undefined);

      if (currentProduct) {
        console.log('Resetting state after product update for product ID:', currentProduct.id);
      } else {
        console.log('Resetting state after creating new product');
      }

      await fetchData();
    } catch (err) {
      console.error('Ürün kaydedilirken hata oluştu:', err);
      setError('Ürün kaydedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setLoading(true);
        const success = await productService.deleteProduct(id);
        if (success) {
          setSuccessMessage('Ürün başarıyla silindi');
          await fetchData();
        } else {
          setError('Ürün silinirken bir hata oluştu');
        }
      } catch (err) {
        console.error('Ürün silinirken hata oluştu:', err);
        setError('Ürün silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = async (product: IProduct) => {
    try {
      setLoading(true);
      console.log('Opening edit form for product ID:', product.id);

      const productToEdit = { ...product };

      if (!productToEdit.options || !Array.isArray(productToEdit.options) || productToEdit.options.length === 0) {
        console.log(`Product ${productToEdit.id} has no options or options is not an array. Loading options from API...`);
        try {
          const options = await productService.getProductOptions(productToEdit.id);
          console.log(`Retrieved ${options.length} options for product ${productToEdit.id} from API:`, options);
          productToEdit.options = Array.isArray(options) ? options : [];
        } catch (optionsError) {
          console.error('Error fetching options for product:', optionsError);
          productToEdit.options = [];
        }
      } else {
        console.log(`Product ${productToEdit.id} already has ${productToEdit.options.length} options:`, productToEdit.options);
      }

      setCurrentProduct(productToEdit);
      setShowForm(true);
      setSuccessMessage('');
    } catch (err) {
      console.error('Ürün düzenleme formu açılırken hata oluştu:', err);
      setError('Ürün bilgileri yüklenirken bir hata oluştu.');
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

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : '-';
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Ürünler</h1>
        {!showForm && (
          <button
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
            onClick={() => {
              setCurrentProduct(undefined);
              setShowForm(true);
              setSuccessMessage('');
            }}
          >
            Yeni Ürün
          </button>
        )}
      </div>

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

      {showForm ? (
        <ProductForm
          product={currentProduct}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setCurrentProduct(undefined);
          }}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-md sm:flex-row">
            <div className="flex-1">
              <label htmlFor="categoryFilter" className="mb-1 block text-sm font-medium text-gray-700">
                Kategoriye Göre Filtrele
              </label>
              <select
                id="categoryFilter"
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="searchFilter" className="mb-1 block text-sm font-medium text-gray-700">
                Ara
              </label>
              <input
                type="text"
                id="searchFilter"
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="Ürün adı ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading && <p className="text-center text-gray-500">Yükleniyor...</p>}

          {!loading && products.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center shadow-md">
              <p className="text-gray-500">Ürün bulunamadı.</p>
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
                      Ürün
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Kategori
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Fiyat
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Durum
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.image_url && (
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={product.image_url}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No+Image';
                                }}
                              />
                            </div>
                          )}
                          <div className={`${product.image_url ? 'ml-4' : ''}`}>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">
                                <div className="max-w-xs truncate">{product.description}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {getCategoryName(product.category_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {(() => {
                          let amount = 0;
                          if (typeof product.price === 'number') {
                            amount = product.price;
                          } else if (product.price) {
                            const parsed = Number.parseFloat(product.price);
                            if (!isNaN(parsed)) {
                              amount = parsed;
                            }
                          }
                          return `${amount.toFixed(2)} ₺`;
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="ml-4 text-red-600 hover:text-red-900"
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
    </div>
  );
};

export default ProductsPage;