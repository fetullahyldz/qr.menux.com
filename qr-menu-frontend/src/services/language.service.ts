import apiService from './api.service';
import type { ILanguage, ITranslation } from '../types';

class LanguageService {
  private endpoint = '/languages';
  private translationEndpoint = '/translations';
  private currentLanguageCode: string | null = null;
  private translations: Record<string, string> = {};

  constructor() {
    // Tarayıcıdan mevcut dil kodunu al
    this.currentLanguageCode = localStorage.getItem('language') || null;
  }

  // Şu anki dil kodunu döndür
  public getCurrentLanguageCode(): string {
    if (!this.currentLanguageCode) {
      return 'tr'; // Varsayılan dil
    }
    return this.currentLanguageCode;
  }

  // Dili değiştir
  public async setLanguage(languageCode: string): Promise<boolean> {
    try {
      // Önce dil kodunun geçerli olup olmadığını kontrol et
      const language = await this.getLanguageByCode(languageCode);

      if (!language) {
        return false;
      }

      // Dil kodunu kaydet
      this.currentLanguageCode = languageCode;
      localStorage.setItem('language', languageCode);

      // Çevirileri yükle
      await this.loadTranslations(languageCode);

      return true;
    } catch (error) {
      console.error('Error setting language:', error);
      return false;
    }
  }

  // Çevirileri yükle
  public async loadTranslations(languageCode: string): Promise<boolean> {
    try {
      const response = await apiService.get<ITranslation[]>(
        `${this.translationEndpoint}?language_code=${languageCode}`
      );

      if (!response.success || !response.data) {
        return false;
      }

      // Çevirileri temizle
      this.translations = {};

      // Yeni çevirileri ekle
      for (const translation of response.data) {
        this.translations[translation.resource_key] = translation.resource_value;
      }

      return true;
    } catch (error) {
      console.error('Error loading translations:', error);
      return false;
    }
  }

  // Çeviri al
  public t(key: string, defaultValue: string = key): string {
    return this.translations[key] || defaultValue;
  }

  // Tüm dilleri getir
  public async getLanguages(activeOnly = true): Promise<ILanguage[]> {
    try {
      const response = await apiService.get<ILanguage[]>(
        `${this.endpoint}?active=${activeOnly}`
      );

      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Error fetching languages:', error);
      return [];
    }
  }

  // Dil kodu ile dil getir
  public async getLanguageByCode(code: string): Promise<ILanguage | null> {
    try {
      const response = await apiService.get<ILanguage>(`${this.endpoint}/${code}`);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Error fetching language:', error);
      return null;
    }
  }

  // Varsayılan dili getir
  public async getDefaultLanguage(): Promise<ILanguage | null> {
    try {
      const languages = await this.getLanguages();
      return languages.find(lang => lang.is_default) || null;
    } catch (error) {
      console.error('Error fetching default language:', error);
      return null;
    }
  }

  // Uygulamayı başlatırken dil ayarlarını yükle
  public async initializeLanguage(): Promise<boolean> {
    try {
      // Eğer kullanıcı daha önce dil seçtiyse, onu kullan
      let languageCode = this.getCurrentLanguageCode();

      // Eğer dil kodu yoksa, tarayıcı dilini kontrol et
      if (!languageCode) {
        const browserLang = navigator.language.split('-')[0];
        const languages = await this.getLanguages();

        // Tarayıcı dili mevcut mu kontrol et
        const browserLanguage = languages.find(lang => lang.code === browserLang);

        if (browserLanguage) {
          languageCode = browserLanguage.code;
        } else {
          // Tarayıcı dili mevcut değilse, varsayılan dili kullan
          const defaultLanguage = await this.getDefaultLanguage();
          languageCode = defaultLanguage ? defaultLanguage.code : 'tr';
        }
      }

      // Dili ayarla
      return await this.setLanguage(languageCode);
    } catch (error) {
      console.error('Error initializing language:', error);
      return false;
    }
  }
}

export const languageService = new LanguageService();
export default languageService;
