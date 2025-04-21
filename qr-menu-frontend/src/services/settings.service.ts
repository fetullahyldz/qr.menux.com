import apiService from './api.service';

export interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialMedia {
  id: number;
  platform: string;
  url: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Doğru tip tanımları için Setting interface güncellendi
interface Setting {
  key: string;
  value: any;
  // Sadece belirli değerler alabilir
  type: 'text' | 'number' | 'boolean' | 'json' | 'image';
  is_public: boolean;
}

export interface SiteSettings {
  restaurant_name?: string;
  restaurant_slogan?: string;
  restaurant_description?: string;
  restaurant_logo?: string;
  footer_slogan?: string;
  footer_desc?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  working_hours_weekdays?: string;
  working_hours_weekends?: string;
  [key: string]: any;
}

class SettingsService {
  private cache: {
    settings?: SiteSettings;
    banners?: Banner[];
    socialMedia?: SocialMedia[];
    lastFetched: {
      settings?: number;
      banners?: number;
      socialMedia?: number;
    };
  } = {
    lastFetched: {}
  };

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get all public settings
  public async getSettings(force = false): Promise<SiteSettings> {
    console.log('Getting public settings...', force ? '(forced refresh)' : '');

    // Check if cache is still valid (only if force is false)
    const now = Date.now();
    if (
      !force &&
      this.cache.settings &&
      this.cache.lastFetched.settings &&
      now - this.cache.lastFetched.settings < this.CACHE_TTL
    ) {
      console.log('Returning cached settings');
      return this.cache.settings;
    }

    try {
      // Önbelleği atlayacak zaman damgası ekle
      const timestamp = new Date().getTime();
      const response = await apiService.get<any>('/settings', { _t: timestamp });
      console.log('Settings API response:', response);

      if (response.success && response.data) {
        let formattedSettings: SiteSettings = {};

        // API'den gelen verilerin biçimine göre işle
        if (typeof response.data === 'object' && response.data !== null) {
          // API'den gelen tüm verileri ekle
          formattedSettings = { ...response.data };
          console.log('API settings data format recognized:', formattedSettings);
        } else {
          console.warn('API returned unexpected settings format:', response.data);
        }

        // Önbelleğe al
        this.cache.settings = formattedSettings;
        this.cache.lastFetched.settings = now;
        console.log('Settings saved to cache');

        return formattedSettings;
      }

      console.warn('API returned no valid settings data');
      return {}; // SQL'den veri gelmediğinde boş obje döndür
    } catch (error) {
      console.error('Error fetching settings:', error);
    }

    // Eski önbelleğe alınmış veriyi döndür (varsa)
    if (this.cache.settings) {
      console.log('Using cached settings after API error');
      return this.cache.settings;
    }

    // Son çare olarak boş obje döndür
    console.log('No settings available, returning empty object');
    return {};
  }

  // Get a specific setting
  public async getSetting(key: string): Promise<any> {
    try {
      const response = await apiService.get(`/settings/${key}`);
      console.log(`Setting ${key} API response:`, response);

      if (response.success && response.data) {
        return response.data.value;
      }

      console.warn(`Failed to get setting ${key} from API`);
      return null;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  }

  // File Upload for settings (yeni eklenen metod)
  public async uploadFile(key: string, file: File): Promise<any> {
    try {
      console.log(`Uploading file for setting ${key}:`, file.name, file.size);

      // Use the updated endpoint to upload the file - pass 'file' as the form field name
      console.log(`Sending file to /settings/upload/${key} with field name "file"`);
      const response = await apiService.uploadFile(`/settings/upload/${key}`, file, 'file');
      console.log(`Upload file for ${key} API response:`, response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.settings = undefined;
        this.cache.lastFetched.settings = undefined;

        // Check response structure and return appropriate data
        if (typeof response.data === 'object' && response.data !== null) {
          // Success case - prioritize file_url or value fields
          if (response.data.file_url) {
            return response.data;
          } else if (response.data.value) {
            return { value: response.data.value, file_url: response.data.value };
          }
        }
        return response.data;
      }

      console.warn(`Failed to upload file for ${key} via API, using fallback data URL`);
      return this.createDataUrlFromFile(file);
    } catch (error) {
      console.error(`Error uploading file for ${key}:`, error);
      // Fallback to data URL if API fails
      console.log(`Using fallback data URL for ${key}`);
      return this.createDataUrlFromFile(file);
    }
  }

  // Update a setting
  public async updateSetting(
    key: string,
    value: any,
    type?: 'text' | 'number' | 'boolean' | 'json' | 'image',
    is_public?: boolean
  ): Promise<Setting | null> {
    try {
      const data: Partial<Setting> = {
        value,
        ...(type && { type }),
        ...(is_public !== undefined && { is_public })
      };

      const response = await apiService.put<Setting>(`/settings/${key}`, data);
      console.log(`Update setting ${key} API response:`, response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.settings = undefined;
        this.cache.lastFetched.settings = undefined;

        return response.data;
      }

      console.warn(`Failed to update setting ${key} via API`);
      return null;
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      return null;
    }
  }

  // Create a setting
  public async createSetting(
    key: string,
    value: any,
    type: 'text' | 'number' | 'boolean' | 'json' | 'image' = 'text',
    is_public = true
  ): Promise<Setting | null> {
    try {
      const data: Partial<Setting> = {
        key,
        value,
        type,
        is_public
      };

      const response = await apiService.post<Setting>('/settings', data);
      console.log(`Create setting ${key} API response:`, response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.settings = undefined;
        this.cache.lastFetched.settings = undefined;

        return response.data;
      }

      console.warn(`Failed to create setting ${key} via API`);
      return null;
    } catch (error) {
      console.error(`Error creating setting ${key}:`, error);
      return null;
    }
  }

  // Get all banners
  public async getBanners(activeOnly = true, force = false): Promise<Banner[]> {
    console.log('Getting banners...', force ? '(forced refresh)' : '');

    // Check if cache is still valid (only if force is false)
    const now = Date.now();
    if (
      !force &&
      this.cache.banners &&
      this.cache.lastFetched.banners &&
      now - this.cache.lastFetched.banners < this.CACHE_TTL
    ) {
      console.log('Returning cached banners');
      const banners = this.cache.banners;
      return activeOnly ? banners.filter(banner => banner.is_active) : banners;
    }

    try {
      const response = await apiService.get<Banner[]>('/banners');
      console.log('Banners API response:', response);

      if (response.success && response.data) {
        // Sort banners by display order
        const banners = Array.isArray(response.data) ? response.data : [];
        banners.sort((a, b) => a.display_order - b.display_order);

        // Cache all banners
        this.cache.banners = banners;
        this.cache.lastFetched.banners = now;

        // Return filtered or all banners based on activeOnly parameter
        const result = activeOnly ? banners.filter(banner => banner.is_active) : banners;
        console.log(`Returning ${result.length} banners`);
        return result;
      }

      console.warn('Failed to fetch banners from API');
      return []; // SQL'den veri gelmediğinde boş dizi döndür
    } catch (error) {
      console.error('Error fetching banners:', error);
      return []; // Hata durumunda boş dizi döndür
    }
  }

  // Create a banner
  public async createBanner(bannerData: Partial<Banner>): Promise<Banner | null> {
    try {
      console.log('Creating new banner with data:', bannerData);

      // Ensure image_url is properly formatted if it's a data URL
      if (bannerData.image_url && bannerData.image_url.startsWith('data:')) {
        console.log('Using data URL for banner image');
      }

      const response = await apiService.post<Banner>('/banners', bannerData);
      console.log('Create banner API response:', response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.banners = undefined;
        this.cache.lastFetched.banners = undefined;

        return response.data;
      }

      console.warn('Failed to create banner via API');
      return null;
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error; // Re-throw to allow handling in the component
    }
  }

  // Update a banner
  public async updateBanner(id: number, bannerData: Partial<Banner>): Promise<Banner | null> {
    try {
      console.log(`Updating banner ${id} with data:`, bannerData);

      // Ensure image_url is properly formatted if it's a data URL
      if (bannerData.image_url && bannerData.image_url.startsWith('data:')) {
        console.log('Using data URL for banner image');
      }

      const response = await apiService.put<Banner>(`/banners/${id}`, bannerData);
      console.log(`Update banner ${id} API response:`, response);

      if (response.success && response.data) {
        // Invalidate banners cache
        this.cache.banners = undefined;
        this.cache.lastFetched.banners = undefined;
        return response.data;
      }

      console.warn(`Failed to update banner ${id} via API`);
      return null;
    } catch (error) {
      console.error(`Error updating banner ${id}:`, error);
      throw error; // Re-throw to allow handling in the component
    }
  }

  // Upload banner image
  public async uploadBannerImage(file: File): Promise<{ image_url: string } | null> {
    console.log('Uploading banner image:', file.name, file.size);
    try {
      // Use the dedicated banner image upload endpoint with the correct form field name
      console.log('Sending banner image to /banners/upload with field name "image"');
      const response = await apiService.uploadFile<{ image_url: string }>('/banners/upload', file, 'image');

      console.log('Banner upload response:', response);

      if (response.success && response.data && response.data.image_url) {
        console.log('Banner image uploaded successfully:', response.data.image_url);
        return response.data;
      } else {
        console.warn('API banner image upload failed with response:', response);

        // Fallback to dataURL method
        return this.createDataUrlFromFile(file);
      }
    } catch (error) {
      console.error('API banner image upload failed, using fallback:', error);

      // Fallback to dataURL method
      return this.createDataUrlFromFile(file);
    }
  }

  // Helper method to create data URL from file
  private async createDataUrlFromFile(file: File): Promise<{ image_url: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          console.log('Created local data URL for image');
          // DataURL'i localStorage'de sakla (opsiyonel)
          const imageKey = `image_${Date.now()}`;
          try {
            localStorage.setItem(imageKey, result);
          } catch (storageError) {
            console.warn('Failed to store image in localStorage (might be too large):', storageError);
          }
          resolve({ image_url: result });
        } else {
          reject(new Error('Failed to convert file to data URL'));
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  // Delete a banner
  public async deleteBanner(id: number): Promise<boolean> {
    try {
      const response = await apiService.delete(`/banners/${id}`);
      console.log(`Delete banner ${id} API response:`, response);

      if (response.success) {
        // Clear cache
        this.cache.banners = undefined;
        this.cache.lastFetched.banners = undefined;

        return true;
      }

      console.warn(`Failed to delete banner ${id} via API`);
      return false;
    } catch (error) {
      console.error(`Error deleting banner ${id}:`, error);
      return false;
    }
  }

  // Get all social media links
  public async getSocialMedia(activeOnly = true, force = false): Promise<SocialMedia[]> {
    console.log('Getting social media links...', force ? '(forced refresh)' : '');

    // Check if cache is still valid (only if force is false)
    const now = Date.now();
    if (
      !force &&
      this.cache.socialMedia &&
      this.cache.lastFetched.socialMedia &&
      now - this.cache.lastFetched.socialMedia < this.CACHE_TTL
    ) {
      console.log('Returning cached social media links');
      const socialMedia = this.cache.socialMedia;
      return activeOnly ? socialMedia.filter(sm => sm.is_active) : socialMedia;
    }

    try {
      const response = await apiService.get<SocialMedia[]>('/social-media');
      console.log('Social media API response:', response);

      if (response.success && response.data) {
        // Sort by display order
        const socialMedia = Array.isArray(response.data) ? response.data : [];
        socialMedia.sort((a, b) => a.display_order - b.display_order);

        // Cache social media links
        this.cache.socialMedia = socialMedia;
        this.cache.lastFetched.socialMedia = now;

        // Return filtered or all social media links based on activeOnly parameter
        const result = activeOnly ? socialMedia.filter(sm => sm.is_active) : socialMedia;
        console.log(`Returning ${result.length} social media links`);
        return result;
      }

      console.warn('Failed to fetch social media links from API');
      return [];
    } catch (error) {
      console.error('Error fetching social media links:', error);
      return [];
    }
  }

  // Create a social media link
  public async createSocialMediaLink(linkData: Partial<SocialMedia>): Promise<SocialMedia | null> {
    try {
      const response = await apiService.post<SocialMedia>('/social-media', linkData);
      console.log('Create social media link API response:', response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.socialMedia = undefined;
        this.cache.lastFetched.socialMedia = undefined;

        return response.data;
      }

      console.warn('Failed to create social media link via API');
      return null;
    } catch (error) {
      console.error('Error creating social media link:', error);
      return null;
    }
  }

  // Update a social media link
  public async updateSocialMediaLink(id: number, linkData: Partial<SocialMedia>): Promise<SocialMedia | null> {
    try {
      const response = await apiService.put<SocialMedia>(`/social-media/${id}`, linkData);
      console.log(`Update social media link ${id} API response:`, response);

      if (response.success && response.data) {
        // Clear cache
        this.cache.socialMedia = undefined;
        this.cache.lastFetched.socialMedia = undefined;

        return response.data;
      }

      console.warn(`Failed to update social media link ${id} via API`);
      return null;
    } catch (error) {
      console.error(`Error updating social media link ${id}:`, error);
      return null;
    }
  }

  // Delete a social media link
  public async deleteSocialMediaLink(id: number): Promise<boolean> {
    try {
      const response = await apiService.delete(`/social-media/${id}`);
      console.log(`Delete social media link ${id} API response:`, response);

      if (response.success) {
        // Clear cache
        this.cache.socialMedia = undefined;
        this.cache.lastFetched.socialMedia = undefined;

        return true;
      }

      console.warn(`Failed to delete social media link ${id} via API`);
      return false;
    } catch (error) {
      console.error(`Error deleting social media link ${id}:`, error);
      return false;
    }
  }

  // Create a social media link (renamed from createSocialMediaLink to createSocialMedia)
  public async createSocialMedia(linkData: Partial<SocialMedia>): Promise<SocialMedia | null> {
    return this.createSocialMediaLink(linkData);
  }

  // Update a social media link (renamed from updateSocialMediaLink to updateSocialMedia)
  public async updateSocialMedia(id: number, linkData: Partial<SocialMedia>): Promise<SocialMedia | null> {
    return this.updateSocialMediaLink(id, linkData);
  }

  // Delete a social media link (renamed from deleteSocialMediaLink to deleteSocialMedia)
  public async deleteSocialMedia(id: number): Promise<boolean> {
    return this.deleteSocialMediaLink(id);
  }

  // Get social media (shorthand for getSocialMediaLinks for consistency)
  public async getSocialMediaLinks(activeOnly = true): Promise<SocialMedia[]> {
    return this.getSocialMedia(activeOnly);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
