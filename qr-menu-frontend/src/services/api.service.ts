import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios';

// API URL'ini ayarla
const apiUrl = import.meta.env.VITE_API_URL;
const baseURL: string = apiUrl || 'http://localhost:3002/api'; // Updated port from 3001 to 3002

console.log('Using API URL:', baseURL);

// API bağlantı durumunu takip et
let isApiConnected = true;
let connectionFailCount = 0;
const MAX_FAIL_COUNT = 3;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 30000; // 30 saniye

// Bağlantı durumunu kontrol eden fonksiyon
const checkApiConnection = async (): Promise<boolean> => {
  // Son deneme üzerinden belirli bir süre geçmediyse tekrar deneme
  const now = Date.now();
  if (now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    return isApiConnected;
  }

  lastConnectionAttempt = now;

  try {
    const response = await fetch(`${baseURL}/health-check`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // API'nin erişilemiyor olma durumuna karşı kısa timeout
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      // Bağlantı başarılı
      isApiConnected = true;
      connectionFailCount = 0;
      console.log('API connection restored');
      return true;
    }

    // Bağlantı başarısız
    connectionFailCount++;
    if (connectionFailCount >= MAX_FAIL_COUNT) {
      isApiConnected = false;
      console.warn(`API connection failed ${connectionFailCount} times, switched to offline mode`);
    }
    return false;
  } catch (error) {
    // Bağlantı hatası
    connectionFailCount++;
    if (connectionFailCount >= MAX_FAIL_COUNT) {
      isApiConnected = false;
      console.warn(`API connection failed ${connectionFailCount} times, switched to offline mode`);
    }
    return false;
  }
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Timeout için süreyi uzatalım
  timeout: 30000, // 30 saniye
  // CORS sorunlarıyla başa çıkmak için
  withCredentials: false
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      // CORS için header eklemesini kaldırdık
    }

    // URL'yi log yapalım
    console.log(`Making request to: ${config.baseURL}${config.url}`);

    // Talep için zaman damgası ekleyelim (önbelleği kırmak için)
    if (config.params) {
      config.params._t = new Date().getTime();
    } else {
      config.params = { _t: new Date().getTime() };
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url} received:`, {
      status: response.status,
      headers: response.headers,
      data: response.data ? 'Data present' : 'No data'
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });

      // 401 işlemesi
      if (error.response.status === 401) {
        const path = window.location.pathname;
        if (path.startsWith('/admin') && path !== '/login') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      console.error('No response received:', {
        url: error.config?.url,
        method: error.config?.method
      });
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Define response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

// API service class
class ApiService {
  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // BaseURL değerini döndüren metot
  getBaseUrl(): string {
    return baseURL;
  }

  // Bağlantı durumunu kontrol eden helper metod
  private async ensureConnection(): Promise<boolean> {
    if (!isApiConnected) {
      // Bağlantıyı tekrar kontrol et
      return await checkApiConnection();
    }
    return true;
  }

  async get<T = any>(url: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      console.log(`API GET Request to: ${baseURL}${url}`, { params });

      // Bağlantı durumunu kontrol et
      const connected = await this.ensureConnection();
      if (!connected) {
        console.error(`API connection failed for GET ${url}`);
        return { success: false, error: { message: 'API bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.' } };
      }

      try {
        const response = await axiosInstance.get(url, { params });
        console.log('API GET Response:', response.status);

        // Yanıt işleme
        let success = true;
        let responseData = null;

        if (response.data) {
          // 1. Format: { success: true, data: [...] }
          if (typeof response.data === 'object' && response.data !== null) {
            if (response.data.success !== undefined && response.data.data !== undefined) {
              success = response.data.success;
              responseData = response.data.data;
            }
            // 2. Format: { data: [...] }
            else if (response.data.data !== undefined) {
              responseData = response.data.data;
            }
            // 3. Format: Doğrudan diziler veya objeler
            else {
              responseData = response.data;
            }
          } else {
            // String veya başka bir tür olması durumunda
            responseData = response.data;
          }
        }

        console.log(`API ${url} processed response:`, { success, dataType: responseData ? typeof responseData : 'null' });
        return { success, data: responseData };
      } catch (error) {
        console.error(`GET request error for ${url}:`, error);

        // Bağlantı hatası durumunu güncelle
        if (error instanceof Error && error.message.includes('Network Error')) {
          connectionFailCount++;
          if (connectionFailCount >= MAX_FAIL_COUNT) {
            isApiConnected = false;
          }

          return {
            success: false,
            error: {
              message: 'Ağ hatası: Sunucuya ulaşılamıyor.',
              originalError: error
            }
          };
        }

        // CORS hatasını tespit et
        if (error instanceof DOMException && error.name === 'NetworkError') {
          console.error('CORS error detected. Make sure your backend has CORS enabled.');
          return {
            success: false,
            error: {
              message: 'CORS error occurred. Check if the server has CORS enabled.',
              originalError: error
            }
          };
        }

        // Axios hatası ise
        if (axios.isAxiosError(error)) {
          const errorDetails = {
            url: `${baseURL}${url}`,
            status: error.response?.status,
            data: error.response?.data
          };
          console.error("API Error Details:", errorDetails);

          if (error.response?.status === 404) {
            return {
              success: false,
              error: { message: `API endpoint not found: ${url}` }
            };
          }
        }

        // Tüm hata durumlarında başarısız yanıt dön
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            originalError: error
          }
        };
      }
    } catch (generalError) {
      console.error(`Unexpected error in GET ${url}:`, generalError);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during the request.',
          originalError: generalError
        }
      };
    }
  }

  // POST request
  async post<T = any>(
    url: string,
    data: Record<string, any> | FormData = {},
    isFormData = false
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`API POST Request to: ${baseURL}${url}`, {
        data: isFormData ? 'FormData object (not displayed)' : data
      });

      // Bağlantı durumunu kontrol et
      const connected = await this.ensureConnection();
      if (!connected) {
        console.error(`API connection failed for POST ${url}`);
        return { success: false, error: { message: 'API bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.' } };
      }

      // Configure axios options - for FormData, let the browser set the Content-Type
      const options: AxiosRequestConfig = {};
      if (isFormData) {
        options.headers = {
          'Content-Type': 'multipart/form-data'
        };
      }

      // Define max retries
      const maxRetries = 2;
      let retries = 0;
      let response;

      // Retry logic
      while (true) {
        try {
          response = await axiosInstance.post(url, data, options);
          console.log('API POST Raw Response:', response);
          break; // If successful, exit the loop
        } catch (retryError) {
          if (retries === maxRetries || (axios.isAxiosError(retryError) && retryError.code !== 'ECONNABORTED')) {
            throw retryError; // Re-throw if max retries reached or not a timeout
          }
          retries++;
          console.log(`Retry attempt ${retries} for POST ${url}`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      // Special handling for auth routes (/auth/login, /auth/register)
      if (url.startsWith('/auth/login') || url.startsWith('/auth/register')) {
        console.log('Auth response detected, special handling:', response.data);

        // Doğrudan auth yanıtını döndür, success ve data yapısını bozmadan
        if (response.data && typeof response.data === 'object') {
          const authData = response.data;

          // Token ve user kontrolü düzeltildi
          if (authData.success === true && authData.token && authData.user) {
            console.log('Valid auth response found');
            return {
              success: true,
              data: authData
            } as ApiResponse<T>;
          } else {
            // Hata mesajını doğru şekilde yakala
            const errorMessage = authData.message || 'Geçersiz kullanıcı adı veya şifre';
            console.log('Başarısız auth yanıtı:', errorMessage);

            return {
              success: false,
              error: { message: errorMessage }
            } as ApiResponse<T>;
          }
        }
      }

      // Backend API yanıt formatını kontrol et
      let success = true;
      let responseData = null;

      if (response.data && typeof response.data === 'object') {
        // 1. Format: { success: true, data: [...] }
        if (response.data.success !== undefined && response.data.data !== undefined) {
          success = response.data.success;
          responseData = response.data.data;
        }
        // 2. Format: { data: [...] }
        else if (response.data.data !== undefined) {
          responseData = response.data.data;
        }
        // 3. Format: Doğrudan veri dizisi veya nesne
        else {
          responseData = response.data;
        }
      } else {
        responseData = response.data;
      }

      console.log('Processed API POST response:', { success, data: responseData });
      return { success, data: responseData };
    } catch (error) {
      console.error('POST request error:', error);

      // Handle error response
      if (axios.isAxiosError(error)) {
        console.log('API Error Details:', {
          url: `${baseURL}${url}`,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        // Handle specific error codes
        if (error.response?.status === 404) {
          console.log(`Endpoint ${url} not found`);
          return {
            success: false,
            error: { message: `API endpoint not found: ${url}` }
          };
        }

        if (error.response?.status === 422) {
          console.log(`Validation error on ${url}`);
          return {
            success: false,
            error: { message: 'Gönderilen veriler geçerli değil', details: error.response?.data }
          };
        }
      } else if (error instanceof Error) {
        console.error('Non-Axios Error:', error.message);
      }

      return { success: false, error };
    }
  }

  async put<T = any>(url: string, data: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      console.log(`API PUT Request to: ${baseURL}${url}`, { data });

      // Bağlantı durumunu kontrol et
      const connected = await this.ensureConnection();
      if (!connected) {
        console.error(`API connection failed for PUT ${url}`);
        return { success: false, error: { message: 'API bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.' } };
      }

      const response: AxiosResponse = await axiosInstance.put(url, data);
      console.log('API PUT Raw Response:', response);

      // Backend API yanıt formatını kontrol et
      let success = true;
      let responseData = null;

      if (response.data && typeof response.data === 'object') {
        // 1. Format: { success: true, data: [...] }
        if (response.data.success !== undefined && response.data.data !== undefined) {
          success = response.data.success;
          responseData = response.data.data;
        }
        // 2. Format: { data: [...] }
        else if (response.data.data !== undefined) {
          responseData = response.data.data;
        }
        // 3. Format: Doğrudan veri dizisi veya nesne
        else {
          responseData = response.data;
        }
      } else {
        responseData = response.data;
      }

      console.log('Processed API PUT response:', { success, data: responseData });
      return { success, data: responseData };
    } catch (error) {
      console.error('PUT request error:', error);
      return { success: false, error };
    }
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      console.log(`API DELETE Request to: ${baseURL}${url}`);

      // Bağlantı durumunu kontrol et
      const connected = await this.ensureConnection();
      if (!connected) {
        console.error(`API connection failed for DELETE ${url}`);
        return { success: false, error: { message: 'API bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.' } };
      }

      const response: AxiosResponse = await axiosInstance.delete(url);
      console.log('API DELETE Raw Response:', response);

      // Backend API yanıt formatını kontrol et
      let success = true;
      let responseData = null;

      if (response.data && typeof response.data === 'object') {
        // 1. Format: { success: true, data: [...] }
        if (response.data.success !== undefined && response.data.data !== undefined) {
          success = response.data.success;
          responseData = response.data.data;
        }
        // 2. Format: { data: [...] }
        else if (response.data.data !== undefined) {
          responseData = response.data.data;
        }
        // 3. Format: Doğrudan veri dizisi veya nesne
        else {
          responseData = response.data;
        }
      } else {
        responseData = response.data;
      }

      console.log('Processed API DELETE response:', { success, data: responseData });
      return { success, data: responseData };
    } catch (error) {
      console.error('DELETE request error:', error);
      return { success: false, error };
    }
  }

  async uploadFile<T = any>(
    url: string,
    file: File,
    formName = 'file',
    additionalData: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`Uploading file to ${baseURL}${url}:`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        formFieldName: formName
      });

      // Bağlantı durumunu kontrol et
      const connected = await this.ensureConnection();
      if (!connected) {
        console.error(`API connection failed for uploadFile ${url}`);
        return { success: false, error: { message: 'API bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.' } };
      }

      // Create a new FormData object
      const formData = new FormData();

      // Important: Log the real File object before appending
      console.log(`Adding file to form with name "${formName}":`, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        isFileInstance: file instanceof File
      });

      // Append file to form data with specified form field name
      formData.append(formName, file);

      // Add additional form data
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      // Add timestamp to prevent caching
      formData.append('_t', Date.now().toString());

      // Log what we're sending
      console.log(`FormData for ${url} contains:`, {
        fieldName: formName,
        fileName: file.name,
        fileType: file.type,
        additionalFields: Object.keys(additionalData),
        entries: Array.from(formData.entries()).map(entry => {
          const [key, value] = entry;
          if (value instanceof File) {
            return `${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`;
          }
          return `${key}: ${value}`;
        }).join(', ')
      });

      // Correctly configure headers for file upload
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: 60000  // 60 seconds
      };

      console.log(`Sending file upload request to: ${baseURL}${url}`);

      // Upload with retry mechanism
      let attempts = 0;
      const maxAttempts = 3;
      let response;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          response = await axiosInstance.post(url, formData, config);
          console.log(`File upload attempt ${attempts} successful:`, response.status);
          break;
        } catch (retryError) {
          console.warn(`File upload attempt ${attempts} failed:`, retryError);
          if (attempts >= maxAttempts) {
            throw retryError;
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
        }
      }

      if (!response) {
        throw new Error('File upload failed after retry attempts');
      }

      console.log('File upload response:', response);

      // Process response
      let success = true;
      let responseData = null;

      if (response.data) {
        if (typeof response.data === 'object' && response.data !== null) {
          if (response.data.success !== undefined && response.data.data !== undefined) {
            success = response.data.success;
            responseData = response.data.data;
          } else if (response.data.data !== undefined) {
            responseData = response.data.data;
          } else if (response.data.image_url !== undefined ||
                    response.data.file_url !== undefined ||
                    response.data.url !== undefined) {
            responseData = response.data;
          } else {
            responseData = response.data;
          }
        } else {
          responseData = response.data;
        }
      }

      console.log('Processed file upload response:', { success, data: responseData });
      return { success, data: responseData };
    } catch (error) {
      console.error('File upload error:', error);

      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }

      return {
        success: false,
        error: {
          message: 'Dosya yüklenirken bir hata oluştu.',
          details: axios.isAxiosError(error) ? error.response?.data : error
        }
      };
    }
  }

  // Bu yardımcı fonksiyon, görsel URL'lerini doğrular ve düzeltir
  checkAndFixImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;

    // Boş string kontrolü
    if (typeof url === 'string' && url.trim() === '') {
      return undefined;
    }

    try {
      // URL formatını kontrol et
      new URL(url);
      return url;
    } catch (e) {
      // Eğer URL formatı geçerli değilse, placeholder URL kullan
      console.warn('Invalid image URL format:', url);
      return 'https://via.placeholder.com/300x200';
    }
  }
}

// Create and export the service instance
const apiService = new ApiService();

// Export axios instance for backward compatibility
export { axiosInstance as api };

export default apiService;
