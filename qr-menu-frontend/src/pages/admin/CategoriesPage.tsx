import type React from 'react';
import { useState, useEffect } from 'react';
import { categoryService } from '../../services';
import type { ICategory } from '../../types';

// Kategori düzenleme/oluşturma için form bileşeni
const CategoryForm = ({
  category,
  onSubmit,
  onCancel,
}: {
  category?: ICategory;
  onSubmit: (categoryData: Partial<ICategory>, imageFile?: File) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [imageUrl, setImageUrl] = useState(category?.image_url || '');
  const [isActive, setIsActive] = useState(category?.is_active !== false);
  const [sortOrder, setSortOrder] = useState(category?.sort_order || 0);

  // Dosya yükleme state'i
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Görsel URL'si veya görsel dosyası değiştiğinde önizleme güncelle
  useEffect(() => {
    // Eğer zaten bir önizleme veya dosya yoksa ve kategori image_url varsa, onu kullan
    if (!imagePreview && !imageFile && category?.image_url) {
      setImagePreview(category.image_url);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        name,
        description,
        image_url: imageUrl,
        is_active: isActive,
        sort_order: sortOrder,
      },
      imageFile || undefined
    );
  };

  // Dosya seçimi değiştiğinde
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Önizleme oluştur
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result.toString());
          // Dosya seçildiğinde URL alanını temizle
          setImageUrl('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // URL alanı değiştiğinde dosya seçimini temizle
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
        <div className="mb-4">
          <label htmlFor="name" className="mb-1 block font-medium text-gray-700">
            Kategori Adı <span className="text-red-500">*</span>
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
          <label htmlFor="imageUrl" className="mb-1 block font-medium text-gray-700">
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

          <div className="mt-3">
            <p className="mb-1 text-sm text-gray-600">veya bilgisayarınızdan bir görsel seçin:</p>
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

          {/* Görsel önizleme - URL veya dosyadan */}
          {(imageUrl || imagePreview) && (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-gray-600">Önizleme:</p>
              <img
                src={imagePreview || imageUrl}
                alt="Kategori Görseli"
                className="h-32 w-32 rounded-md object-cover border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Resim+Yok';
                }}
              />
            </div>
          )}
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
            {category ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<ICategory | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState('');

  // Kategorileri yükle
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching categories from database...');

      // Zaman damgası ekleyerek önbelleği atlayalım
      const timestamp = new Date().getTime();
      const data = await categoryService.getCategories({
        _t: timestamp, // Önbelleği atlamak için zaman damgası
      });

      console.log('Categories fetched from database:', data);

      if (Array.isArray(data)) {
        // Verileri ekrana yansıt
        setCategories(data);
        console.log('Categories set to state:', data);

        // No data case - UI message
        if (data.length === 0) {
          console.log('No categories found in database');
        }
      } else {
        console.error('Unexpected data format:', data);
        setCategories([]);
        setError('Beklenmeyen veri formatı');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Kategoriler yüklenirken bir hata oluştu.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Kategori oluştur veya güncelle
  const handleSubmit = async (categoryData: Partial<ICategory>, imageFile?: File) => {
    try {
      setLoading(true);
      setError('');

      console.log('Submitting category data:', categoryData, imageFile ? `with image: ${imageFile.name}` : 'without image');

      let result;
      if (currentCategory) {
        // Kategori güncelleme
        console.log(`Updating category with ID: ${currentCategory.id}`, categoryData);
        result = await categoryService.updateCategory(currentCategory.id, categoryData, imageFile);
        console.log('Category update result:', result);

        if (result) {
          // Başarılı güncelleme
          setSuccessMessage('Kategori başarıyla güncellendi');
        } else {
          setError('Kategori güncellenirken bir hata oluştu');
        }
      } else {
        // Yeni kategori oluşturma
        console.log('Creating new category:', categoryData);
        result = await categoryService.createCategory(categoryData, imageFile);
        console.log('Category creation result:', result);

        if (result) {
          // Başarılı oluşturma
          setSuccessMessage('Kategori başarıyla oluşturuldu');
        } else {
          setError('Kategori oluşturulurken bir hata oluştu');
        }
      }

      // Formu kapat ve kategorileri yeniden yükle
      if (result) {
        setShowForm(false);
        setCurrentCategory(undefined);
        await fetchCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Kategori kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kategori silme
  const handleDelete = async (id: number) => {
    if (window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setLoading(true);
        console.log(`Deleting category with ID: ${id}`);
        const success = await categoryService.deleteCategory(id);
        console.log('Category deletion result:', success);

        if (success) {
          // Başarılı - localStorage kontrolü
          const demoCategories = localStorage.getItem('demo_categories');
          if (demoCategories) {
            try {
              const categories = JSON.parse(demoCategories);
              console.log('Categories in localStorage after deletion:', categories);

              // localStorage'dan kategorinin silindi mi diye kontrol et
              const deletedCategory = categories.find((c: ICategory) => c.id === id);
              if (!deletedCategory) {
                console.log('Category successfully removed from localStorage');
              } else {
                console.warn('Category still exists in localStorage after deletion');
              }
            } catch (e) {
              console.error('Error checking localStorage after deletion:', e);
            }
          }

          setSuccessMessage('Kategori başarıyla silindi');

          // localStorage'daki değişikliklerin oturuma yansıması için biraz bekle
          setTimeout(async () => {
            await fetchCategories();
          }, 100);
        } else {
          setError('Kategori silinirken bir hata oluştu');
        }
      } catch (err) {
        console.error('Kategori silinirken hata oluştu:', err);
        setError('Kategori silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Kategori düzenleme formunu aç
  const handleEdit = (category: ICategory) => {
    setCurrentCategory(category);
    setShowForm(true);
    setSuccessMessage('');
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
        <h1 className="text-2xl font-bold text-gray-800">Kategoriler</h1>
        {!showForm && (
          <button
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
            onClick={() => {
              setCurrentCategory(undefined);
              setShowForm(true);
              setSuccessMessage('');
            }}
          >
            Yeni Kategori
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

      {/* Kategori Formu */}
      {showForm ? (
        <CategoryForm
          category={currentCategory}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setCurrentCategory(undefined);
          }}
        />
      ) : (
        <>
          {/* Kategoriler Tablosu */}
          {loading && <p className="text-center text-gray-500">Yükleniyor...</p>}

          {!loading && categories.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center shadow-md">
              <p className="text-gray-500">Henüz kategori bulunmamaktadır.</p>
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
                      Sıra
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
                      Açıklama
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
                      Ürün Sayısı
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {category.image_url && (
                            <div className="h-10 w-10 flex-shrink-0">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={category.image_url}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No+Image';
                                }}
                              />
                            </div>
                          )}
                          <div className={`${category.image_url ? 'ml-4' : ''}`}>
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{category.description || '-'}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            category.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {category.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {category.product_count || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(category)}
                          className="mr-2 text-primary hover:text-primary-dark"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
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
    </div>
  );
};

export default CategoriesPage;
