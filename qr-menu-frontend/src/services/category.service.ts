import type { ICategory } from '../types';
import apiService from './api.service';

class CategoryService {
  private endpoint = '/categories';

  // Get all categories
  public async getCategories(params?: Record<string, any>): Promise<ICategory[]> {
    try {
      const response = await apiService.get<ICategory[]>(this.endpoint, params);
      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Get category by ID
  public async getCategoryById(id: number): Promise<ICategory | null> {
    try {
      const response = await apiService.get<ICategory>(`${this.endpoint}/${id}`);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      return null;
    }
  }

  // Upload category image
  public async uploadCategoryImage(file: File): Promise<{ image_url: string } | null> {
    console.log('Uploading category image:', file.name, file.size);
    try {
      // API yükleme denemesi
      try {
        // Önce doğrudan /categories/upload endpoint'ine gönder
        const response = await apiService.uploadFile<{ image_url: string }>('/categories/upload', file, 'file'); 

        if (response.success && response.data && response.data.image_url) {
          console.log('Category image uploaded successfully:', response.data.image_url);
          return response.data;
        }
      } catch (uploadError) {
        console.error('API category image upload failed, using fallback:', uploadError);
      }

      // API upload başarısız olduysa - DataURL olarak dosyayı kullan
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            console.log('Created local data URL for category image');
            // DataURL'i localStorage'de sakla (opsiyonel)
            const imageKey = `category_image_${Date.now()}`;
            try {
              localStorage.setItem(imageKey, result);
            } catch (storageError) {
              console.warn('Failed to store category image in localStorage (might be too large):', storageError);
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
    } catch (error) {
      console.error('Error processing category image:', error);
      return null;
    }
  }

  // Create category
  public async createCategory(categoryData: Partial<ICategory>, imageFile?: File): Promise<ICategory | null> {
    try {
      // Eğer görsel dosyası varsa, yükle
      if (imageFile) {
        const imageResult = await this.uploadCategoryImage(imageFile);
        if (imageResult && imageResult.image_url) {
          categoryData.image_url = imageResult.image_url;
        }
      }

      const response = await apiService.post<ICategory>(this.endpoint, categoryData);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  }

  // Update category
  public async updateCategory(id: number, categoryData: Partial<ICategory>, imageFile?: File): Promise<ICategory | null> {
    try {
      // Eğer görsel dosyası varsa, yükle
      if (imageFile) {
        const imageResult = await this.uploadCategoryImage(imageFile);
        if (imageResult && imageResult.image_url) {
          categoryData.image_url = imageResult.image_url;
        }
      }

      const response = await apiService.put<ICategory>(`${this.endpoint}/${id}`, categoryData);
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      return null;
    }
  }

  // Delete category
  public async deleteCategory(id: number): Promise<boolean> {
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);
      return response.success;
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      return false;
    }
  }

  // Update category order
  public async updateCategoryOrder(categoryIds: number[]): Promise<boolean> {
    try {
      const response = await apiService.put(`${this.endpoint}/order`, { categoryIds });
      return response.success;
    } catch (error) {
      console.error('Error updating category order:', error);
      return false;
    }
  }
}

export const categoryService = new CategoryService();
export default categoryService;
