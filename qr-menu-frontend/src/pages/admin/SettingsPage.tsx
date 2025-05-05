import type React from 'react';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import type { Banner, SocialMedia, SiteSettings } from '../../services/settings.service';
import { settingsService } from '../../services';

// Tabs for the settings page
type SettingsTab = 'general' | 'banners' | 'socialMedia';

// Settings Page Form States
interface GeneralSettingsForm {
  restaurant_name: string;
  restaurant_slogan: string;
  footer_slogan:string;
  footer_desc:string;
  restaurant_description: string;
  restaurant_logo: string;
  phone_number: string;
  email: string;
  address: string;
  googleMap:string;
  working_hours_weekdays: string;
  working_hours_weekends: string;
  wifi_name:string;
  wifi_password:string;
  [key: string]: string;
}

const SettingsPage = () => {
  // Active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form data states
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsForm>({
    restaurant_name: '',
    restaurant_slogan: '',
    footer_slogan:'',
    footer_desc:'',
    restaurant_description: '',
    restaurant_logo: '',
    phone_number: '',
    email: '',
    address: '',
    googleMap:'',
    working_hours_weekdays: '',
    working_hours_weekends: '',
    wifi_name:'',
    wifi_password:''

  });

  // Banner data
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);

  // Social media data
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [editingSocialMedia, setEditingSocialMedia] = useState<Partial<SocialMedia> | null>(null);

  // Banner form için state'ler
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerButtonText, setBannerButtonText] = useState('');
  const [bannerButtonLink, setBannerButtonLink] = useState('');
  const [bannerDisplayOrder, setBannerDisplayOrder] = useState(0);
  const [bannerIsActive, setBannerIsActive] = useState(true);

  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');

  // Feedback messages
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load all settings data
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // Load general settings - force refresh to always get latest data
        const settings = await settingsService.getSettings(true);
        console.log('Loaded settings:', settings);

        // Update form with settings values
        const newGeneralSettings = { ...generalSettings };
        Object.keys(generalSettings).forEach(key => {
          if (settings[key] !== undefined) {
            newGeneralSettings[key] = settings[key]?.toString() || '';
          }
        });
        setGeneralSettings(newGeneralSettings);

        // Set logo preview
        if (settings.restaurant_logo) {
          setLogoPreview(settings.restaurant_logo);
        }

        // Load banners - force refresh
        const bannersData = await settingsService.getBanners(true, true);
        setBanners(bannersData);

        // Load social media - force refresh
        const socialMediaData = await settingsService.getSocialMedia(true, true);
        setSocialMedia(socialMediaData);
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast.error('Ayarlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle logo file change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoPreview(event.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Banner file change
  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);

      // Görsel ön izleme oluştur
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBannerPreview(event.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save general settings
  const saveGeneralSettings = async () => {
    setSaving(true);
    try {
      console.log('Saving general settings:', generalSettings);

      // Process logo upload if a new logo is selected
      if (logoFile) {
        console.log('Uploading logo file:', logoFile.name, logoFile.size);

        try {
          // Ensure we're using the correct field name 'file' for the logo upload
          const logoUploadResult = await settingsService.uploadFile('restaurant_logo', logoFile);
          console.log('Logo upload result:', logoUploadResult);

          if (logoUploadResult) {
            // Check various possible response formats for the logo URL
            const logoUrl = logoUploadResult.value ||
                          logoUploadResult.file_url ||
                          logoUploadResult.url ||
                          (logoUploadResult.data && logoUploadResult.data.file_url);

            if (logoUrl) {
              // Update the logo URL in settings
              setGeneralSettings(prev => ({
                ...prev,
                restaurant_logo: logoUrl
              }));
              console.log('Updated logo URL in settings:', logoUrl);
            } else {
              console.error('Logo upload succeeded but no URL was returned', logoUploadResult);
              toast.error('Logo yüklendi ancak URL alınamadı.');
            }
          } else {
            console.error('Logo upload failed');
            toast.error('Logo yüklenirken bir hata oluştu.');
          }
        } catch (uploadError) {
          console.error('Error during logo upload:', uploadError);
          toast.error('Logo yükleme sırasında bir hata oluştu.');
        }
      }

      // Save all general settings
      console.log('Saving all general settings to server:', generalSettings);
      try {
        for (const [key, value] of Object.entries(generalSettings)) {
          console.log(`Updating setting: ${key} = ${value}`);
          try {
            // Ayarları tek tek kaydet
            await settingsService.updateSetting(key, value);
          } catch (settingError) {
            console.error(`Error saving setting ${key}:`, settingError);
            toast.error(`${key} ayarı kaydedilirken hata oluştu.`);
          }
        }
        toast.success('Genel ayarlar başarıyla kaydedildi.');
      } catch (settingsError) {
        console.error('Error saving general settings:', settingsError);
        toast.error('Ayarlar kaydedilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast.error('Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Yeni banner oluşturma
  const handleCreateBanner = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('Creating new banner...');

      const bannerData: Partial<Banner> = {
        title: bannerTitle || null,
        subtitle: bannerSubtitle || null,
        button_text: bannerButtonText || null,
        button_link: bannerButtonLink || null,
        display_order: bannerDisplayOrder || 0,
        is_active: bannerIsActive,
        image_url: editingBanner?.image_url || ''
      };

      // Eğer yeni bir dosya seçildiyse yükle
      if (bannerFile) {
        console.log('Uploading banner image file:', bannerFile.name);
        try {
          // Önce görseli ayrı bir isteğe yükleyelim
          const imageUploadResult = await settingsService.uploadBannerImage(bannerFile);
          console.log('Banner image upload result:', imageUploadResult);

          if (imageUploadResult && imageUploadResult.image_url) {
            bannerData.image_url = imageUploadResult.image_url;
            console.log('Banner image URL set to:', bannerData.image_url);
          } else {
            console.warn('Banner image upload failed, using fallback URL');

            // Banner görseli yüklenemediyse, geçici bir görsel URL'si kullan
            if (!bannerData.image_url) {
              bannerData.image_url = 'https://via.placeholder.com/800x300';
              toast('Görsel yüklenemedi, geçici görsel kullanılıyor.');
            }
          }
        } catch (uploadError) {
          console.error('Error uploading banner image:', uploadError);
          toast.error('Görsel yüklenirken hata oluştu. Varsayılan görsel kullanılıyor.');
          bannerData.image_url = 'https://via.placeholder.com/800x300';
        }
      }

      if (!bannerData.image_url) {
        bannerData.image_url = 'https://via.placeholder.com/800x300';
        toast('Görsel URL bulunamadı, varsayılan görsel kullanılıyor.');
      }

      console.log('Final banner data:', bannerData);

      let result;
      try {
        if (editingBanner?.id) {
          // Mevcut banner'ı güncelle
          console.log(`Updating existing banner ${editingBanner.id}`);
          result = await settingsService.updateBanner(editingBanner.id, bannerData);
        } else {
          // Yeni banner oluştur
          console.log('Creating new banner');
          result = await settingsService.createBanner(bannerData);
        }

        console.log('Banner save result:', result);

        if (result) {
          toast.success(editingBanner ? 'Banner başarıyla güncellendi' : 'Banner başarıyla oluşturuldu');

          // Formu sıfırla
          setBannerTitle('');
          setBannerSubtitle('');
          setBannerButtonText('');
          setBannerButtonLink('');
          setBannerDisplayOrder(0);
          setBannerIsActive(true);
          setBannerFile(null);
          setBannerPreview('');
          setEditingBanner(null);

          // Bannerları yeniden yükle
          const bannersData = await settingsService.getBanners(true, true);
          setBanners(bannersData);
        } else {
          toast.error(editingBanner ? 'Banner güncellenirken hata oluştu' : 'Banner oluşturulurken hata oluştu');
        }
      } catch (apiError) {
        console.error('API error during banner save:', apiError);
        toast.error(editingBanner
          ? 'Banner güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
          : 'Banner oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Banner kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Banner düzenleme formunu aç
  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title || '');
    setBannerSubtitle(banner.subtitle || '');
    setBannerButtonText(banner.button_text || '');
    setBannerButtonLink(banner.button_link || '');
    setBannerDisplayOrder(banner.display_order || 0);
    setBannerIsActive(banner.is_active);
    setBannerPreview(banner.image_url || '');
  };

  // Delete banner
  const deleteBanner = async (id: number) => {
    if (window.confirm('Bu banneri silmek istediğinizden emin misiniz?')) {
      try {
        const success = await settingsService.deleteBanner(id);
        if (success) {
          const updatedBanners = banners.filter(banner => banner.id !== id);
          setBanners(updatedBanners);
          toast.success('Banner başarıyla silindi.');
        }
      } catch (error) {
        console.error('Error deleting banner:', error);
        toast.error('Banner silinirken bir hata oluştu.');
      }
    }
  };

  // Add or update social media
  const saveSocialMedia = async (socialMediaData: Partial<SocialMedia>) => {
    setSaving(true);
    try {
      let result;
      if (socialMediaData.id) {
        // Update existing social media
        result = await settingsService.updateSocialMedia(socialMediaData.id, socialMediaData);
      } else {
        // Create new social media
        result = await settingsService.createSocialMedia(socialMediaData);
      }

      if (result) {
        // Refresh social media
        const socialMediaData = await settingsService.getSocialMedia(true);
        setSocialMedia(socialMediaData);
        setEditingSocialMedia(null);
        toast.success('Sosyal medya bağlantısı başarıyla kaydedildi.');
      }
    } catch (error) {
      console.error('Error saving social media:', error);
      toast.error('Sosyal medya bağlantısı kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Delete social media
  const deleteSocialMedia = async (id: number) => {
    if (window.confirm('Bu sosyal medya bağlantısını silmek istediğinizden emin misiniz?')) {
      try {
        const success = await settingsService.deleteSocialMedia(id);
        if (success) {
          const updatedSocialMedia = socialMedia.filter(item => item.id !== id);
          setSocialMedia(updatedSocialMedia);
          toast.success('Sosyal medya bağlantısı başarıyla silindi.');
        }
      } catch (error) {
        console.error('Error deleting social media:', error);
        toast.error('Sosyal medya bağlantısı silinirken bir hata oluştu.');
      }
    }
  };

  // Handle tab change
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMessage('');
    // Reset banner editing form when switching tabs
    if (tab !== 'banners') {
      setEditingBanner(null);
      setBannerFile(null);
      setBannerPreview('');
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerButtonText('');
      setBannerButtonLink('');
      setBannerDisplayOrder(0);
      setBannerIsActive(true);
    }
    // Reset social media editing form when switching tabs
    if (tab !== 'socialMedia') {
      setEditingSocialMedia(null);
    }
  };

  // Save button click handler based on active tab
  const handleSaveClick = () => {
    if (activeTab === 'general') {
      saveGeneralSettings();
    } else if (activeTab === 'banners' && editingBanner) {
      handleCreateBanner();
    } else if (activeTab === 'socialMedia' && editingSocialMedia) {
      saveSocialMedia(editingSocialMedia);
    }
  };

  // Render General Tab
  const renderGeneralTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-gray-200">Restoran Bilgileri</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant Name */}
        <div>
          <label htmlFor="restaurant_name" className="block text-sm font-medium text-gray-700 mb-1">
            Restoran Adı
          </label>
          <input
            type="text"
            id="restaurant_name"
            name="restaurant_name"
            value={generalSettings.restaurant_name}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Restaurant Slogan */}
        <div>
          <label htmlFor="restaurant_slogan" className="block text-sm font-medium text-gray-700 mb-1">
            Slogan
          </label>
          <input
            type="text"
            id="restaurant_slogan"
            name="restaurant_slogan"
            value={generalSettings.restaurant_slogan}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="footer_slogan" className="block text-sm font-medium text-gray-700 mb-1">
           Alt Slogan
          </label>
          <input
            type="text"
            id="footer_slogan"
            name="footer_slogan"
            value={generalSettings.footer_slogan}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="footer_desc" className="block text-sm font-medium text-gray-700 mb-1">
          Alt Açıklama
          </label>
          <textarea
            id="footer_desc"
            name="footer_desc"
            rows={4}
            value={generalSettings.footer_desc}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="wifi_name" className="block text-sm font-medium text-gray-700 mb-1">
           Wifi Adı
          </label>
          <input
            type="text"
            id="wifi_name"
            name="wifi_name"
            value={generalSettings.wifi_name}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="wifi_password" className="block text-sm font-medium text-gray-700 mb-1">
           Wifi Şifresi
          </label>
          <input
            type="text"
            id="wifi_password"
            name="wifi_password"
            value={generalSettings.wifi_password}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
        {/* Restaurant Logo */}
        <div className="md:col-span-2">
          <label htmlFor="restaurant_logo" className="block text-sm font-medium text-gray-700 mb-1">
            Logo
          </label>
          <div className="flex items-center space-x-4">
            {logoPreview && (
              <div className="w-20 h-20 border rounded overflow-hidden">
                <img
                  src={logoPreview}
                  alt="Logo Önizleme"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <input
              type="file"
              id="restaurant_logo"
              accept="image/*"
              onChange={handleLogoChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-white
                hover:file:bg-primary-dark"
            />
          </div>
        </div>

        {/* Restaurant Description */}
        <div className="md:col-span-2">
          <label htmlFor="restaurant_description" className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <textarea
            id="restaurant_description"
            name="restaurant_description"
            rows={4}
            value={generalSettings.restaurant_description}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-6 pb-2 border-b border-gray-200">İletişim Bilgileri</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone Number */}
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
            Telefon Numarası
          </label>
          <input
            type="text"
            id="phone_number"
            name="phone_number"
            value={generalSettings.phone_number}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-posta
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={generalSettings.email}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Adres
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            value={generalSettings.address}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="googleMap" className="block text-sm font-medium text-gray-700 mb-1">
           Google Map
          </label>
          <textarea
            id="googleMap"
            name="googleMap"
            rows={4}
            value={generalSettings.googleMap}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

      </div>

      <h2 className="text-xl font-semibold mt-8 mb-6 pb-2 border-b border-gray-200">Çalışma Saatleri</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekday Hours */}
        <div>
          <label htmlFor="working_hours_weekdays" className="block text-sm font-medium text-gray-700 mb-1">
            Hafta İçi
          </label>
          <input
            type="text"
            id="working_hours_weekdays"
            name="working_hours_weekdays"
            placeholder="Örn: 09:00 - 22:00"
            value={generalSettings.working_hours_weekdays}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Weekend Hours */}
        <div>
          <label htmlFor="working_hours_weekends" className="block text-sm font-medium text-gray-700 mb-1">
            Hafta Sonu
          </label>
          <input
            type="text"
            id="working_hours_weekends"
            name="working_hours_weekends"
            placeholder="Örn: 10:00 - 23:00"
            value={generalSettings.working_hours_weekends}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );

  // Banners tab content
  const renderBannerTab = () => {
    return (
      <div>
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold">Banner Yönetimi</h2>
          {!editingBanner && (
            <button
              className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
              onClick={() => {
                setEditingBanner({});
                setBannerTitle('');
                setBannerSubtitle('');
                setBannerButtonText('');
                setBannerButtonLink('');
                setBannerDisplayOrder(0);
                setBannerIsActive(true);
                setBannerFile(null);
                setBannerPreview('');
              }}
            >
              Yeni Banner
            </button>
          )}
        </div>

        {/* Banner list */}
        {banners.length > 0 ? (
          <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Görsel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Başlık</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sıra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={banner.image_url || 'https://via.placeholder.com/150?text=No+Image'}
                        alt={banner.title || 'Banner'}
                        className="h-10 w-20 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{banner.title || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          banner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {banner.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{banner.display_order}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditBanner(banner)}
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.id)}
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
        ) : (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
            Henüz banner bulunmuyor. Yeni bir banner ekleyin.
          </div>
        )}

        {/* Banner form */}
        {editingBanner !== null && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {editingBanner.id ? 'Banner Düzenle' : 'Yeni Banner Ekle'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Başlık</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="Banner başlığı (opsiyonel)"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Alt Başlık</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="Banner alt başlığı (opsiyonel)"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Buton Metni</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                  value={bannerButtonText}
                  onChange={(e) => setBannerButtonText(e.target.value)}
                  placeholder="Buton metni (opsiyonel)"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Buton Bağlantısı</label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                  value={bannerButtonLink}
                  onChange={(e) => setBannerButtonLink(e.target.value)}
                  placeholder="Buton bağlantısı (opsiyonel)"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Sıra</label>
                <input
                  type="number"
                  className="block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-primary focus:ring-primary"
                  value={bannerDisplayOrder}
                  onChange={(e) => setBannerDisplayOrder(Number.parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <div className="mb-4 flex items-center pt-6">
                <input
                  type="checkbox"
                  id="bannerIsActive"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={bannerIsActive}
                  onChange={(e) => setBannerIsActive(e.target.checked)}
                />
                <label htmlFor="bannerIsActive" className="ml-2 block text-sm text-gray-700">
                  Aktif
                </label>
              </div>
              <div className="mb-4 col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Banner Görseli</label>
                <input
                  type="file"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:rounded-md file:border-0
                    file:bg-primary file:px-4 file:py-2
                    file:text-sm file:font-semibold file:text-white
                    hover:file:bg-primary-dark"
                  accept="image/*"
                  onChange={handleBannerFileChange}
                />
                {(bannerPreview || (editingBanner && editingBanner.image_url)) && (
                  <div className="mt-3">
                    <p className="mb-1 text-sm text-gray-600">Önizleme:</p>
                    <img
                      src={bannerPreview || editingBanner.image_url}
                      alt="Banner önizleme"
                      className="mt-2 max-h-32 rounded border border-gray-200 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x300?text=No+Image';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setEditingBanner(null);
                  setBannerFile(null);
                  setBannerPreview('');
                  setBannerTitle('');
                  setBannerSubtitle('');
                  setBannerButtonText('');
                  setBannerButtonLink('');
                  setBannerDisplayOrder(0);
                  setBannerIsActive(true);
                }}
              >
                İptal
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                onClick={handleCreateBanner}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : editingBanner.id ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Social Media Tab
  const renderSocialMediaTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Sosyal Medya Bağlantıları</h2>
        <button
          onClick={() => setEditingSocialMedia({})}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Yeni Bağlantı
        </button>
      </div>

      {/* Social Media list */}
      <div className="mb-8">
        {socialMedia.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Henüz sosyal medya bağlantısı bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {socialMedia.map((social) => (
                  <tr key={social.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {social.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {social.url.length > 30 ? `${social.url.substring(0, 30)}...` : social.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        social.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {social.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{social.display_order}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingSocialMedia(social)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deleteSocialMedia(social.id)}
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
      </div>

      {/* Social Media edit/create form */}
      {editingSocialMedia !== null && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">
            {editingSocialMedia.id ? 'Sosyal Medya Düzenle' : 'Yeni Sosyal Medya Ekle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={editingSocialMedia.platform || ''}
                onChange={(e) => setEditingSocialMedia({...editingSocialMedia, platform: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              >
                <option value="">Platform Seçin</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="pinterest">Pinterest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={editingSocialMedia.url || ''}
                onChange={(e) => setEditingSocialMedia({...editingSocialMedia, url: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (İsteğe bağlı)
              </label>
              <input
                type="text"
                value={editingSocialMedia.icon || ''}
                onChange={(e) => setEditingSocialMedia({...editingSocialMedia, icon: e.target.value})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                placeholder="Özel bir icon kullanmak için"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sıra
              </label>
              <input
                type="number"
                value={editingSocialMedia.display_order || 0}
                onChange={(e) => setEditingSocialMedia({...editingSocialMedia, display_order: Number.parseInt(e.target.value)})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={editingSocialMedia.is_active ? 'true' : 'false'}
                onChange={(e) => setEditingSocialMedia({...editingSocialMedia, is_active: e.target.value === 'true'})}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={() => setEditingSocialMedia(null)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              İptal
            </button>
            <button
              onClick={() => saveSocialMedia(editingSocialMedia)}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Site Ayarları</h1>
        {activeTab === 'general' && (
          <button
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark transition-colors"
            disabled={saving}
            onClick={saveGeneralSettings}
          >
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
          <p>{successMessage}</p>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'general'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('general')}
            >
              Genel Ayarlar
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'banners'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('banners')}
            >
              Banner Yönetimi
            </button>
          </li>
          <li>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'socialMedia'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('socialMedia')}
            >
              Sosyal Medya
            </button>
          </li>
        </ul>
      </div>

      {/* Tab content */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'banners' && renderBannerTab()}
            {activeTab === 'socialMedia' && renderSocialMediaTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
