import type { IProduct, IProductOption } from '../types';
import apiService from './api.service';

class ProductService {
  private endpoint = '/products';
  private optionEndpoint = '/product-options';

  // Get all products
  public async getProducts(params?: Record<string, any>): Promise<IProduct[]> {
    console.log('getProducts çağrıldı, parametreler:', params);
    try {
      // Try to fetch from API
      try {
        const response = await apiService.get<IProduct[]>(this.endpoint, params);
        console.log('Products API response:', response);

        // Parse response based on format
        const products = Array.isArray(response.data) ? response.data :
                       (typeof response.data === 'object' && response.data !== null) ?
                       (response.data as any).data || response.data : [];

        console.log('Parsed products from API:', products);
        return products;
      } catch (apiError) {
        console.error('API request failed, using fallback data:', apiError);

        // Fallback to static data for testing
        const staticProducts: IProduct[] = [];

        // Filter static data based on parameters
        let filteredProducts = [...staticProducts];

        if (params?.category_id) {
          const categoryId = Number.parseInt(params.category_id);
          filteredProducts = filteredProducts.filter(p => p.category_id === categoryId);
        }

        if (params?.is_active !== undefined) {
          const isActive = params.is_active === 'true' || params.is_active === '1' || params.is_active === true ? 1 : 0;
          filteredProducts = filteredProducts.filter(p => p.is_active === Boolean(isActive));
        }

        console.log('Using static product data:', filteredProducts);
        return filteredProducts;
      }
    } catch (error) {
      console.error('getProducts error:', error);
      throw error;
    }
  }

  // Get product by ID
  public async getProductById(id: number): Promise<IProduct | null> {
    console.log(`getProductById çağrıldı, id: ${id}`);
    try {
      const response = await apiService.get<IProduct>(`${this.endpoint}/${id}`);
      console.log('getProductById API yanıtı:', response);

      if (response.success && response.data) {
        // Ürün seçeneklerini yükle ve ekle
        try {
          console.log(`Ürün ${id} için seçenekler yükleniyor...`);
          const options = await this.getProductOptions(id);

          // Eğer options bir dizi değilse, boş dizi yap
          const safeOptions = Array.isArray(options) ? options : [];
          console.log('Yüklenen seçenekler:', safeOptions);

          const productWithOptions = {
            ...response.data,
            options: safeOptions // Boş dizi olsa bile bir dizi eklenmiş olacak
          };

          console.log('Seçeneklerle birlikte ürün:', productWithOptions);
          return productWithOptions;
        } catch (optionsError) {
          console.error(`Ürün ${id} için seçenekler yüklenirken hata:`, optionsError);
          // Seçenekler yüklenmese bile ürünü boş bir options dizisi ile döndür
          return {
            ...response.data,
            options: []
          };
        }
      }

      console.warn(`Ürün ${id} API'den alınamadı`);
      return null;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      return null;
    }
  }

  // Upload product image
  public async uploadProductImage(file: File): Promise<{ image_url: string } | null> {
    console.log('Uploading product image:', file.name, file.size);

    try {
      // Doğrudan /products/upload endpoint'ine gönder
      const formData = new FormData();
      formData.append('file', file);

      // apiService.uploadFile doğrudan kullanılır
      const response = await apiService.uploadFile<{ image_url: string }>('/products/upload', file, 'file');

      if (response.success && response.data && response.data.image_url) {
        console.log('Product image uploaded successfully:', response.data.image_url);
        return response.data;
      }

      // Direkt fetch API ile düzgün bir URL kullanarak dene
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiService.getBaseUrl()}/api/products/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.image_url) {
            console.log('Product image uploaded via fetch fallback:', data.image_url);
            return { image_url: data.image_url };
          }
        }
      } catch (fetchError) {
        console.error('Fetch fallback failed:', fetchError);
      }

      console.error('Upload failed: No valid response from the server');
      return null;
    } catch (error) {
      console.error('Error uploading product image:', error);
      return null;
    }
  }

  // Create option for a product
  public async createProductOption(
    productId: number,
    optionData: Partial<IProductOption>
  ): Promise<IProductOption | null> {
    console.log(`Creating option for product ID: ${productId} with data:`, optionData);

    // Veri formatını hazırla (özellikle price_modifier'ı sayıya dönüştürdüğümüzden emin olalım)
    const safeOptionData = {
      ...optionData,
      price_modifier: typeof optionData.price_modifier === 'number'
        ? optionData.price_modifier
        : Number.parseFloat(String(optionData.price_modifier || 0)) || 0,
      product_id: productId // product_id'yi ekleyerek tüm endpoint'lerde çalışmasını sağla
    };

    console.log('Safe option data prepared:', safeOptionData);

    try {
      // Doğrudan /product-options endpointini kullan, en güvenilir yöntem
      console.log(`Creating option using /product-options with product_id=${productId}`);
      const response = await apiService.post<IProductOption>("/product-options", safeOptionData);
      console.log('Product option API response:', response);

      if (response.success && response.data) {
        console.log('Option created successfully:', response.data);
        return response.data;
      }

      // Alternatif endpoint - bazı API'ler farklı yol kullanabilir
      console.log(`Trying alternative endpoint: /products/${productId}/options`);
      const altResponse = await apiService.post<IProductOption>(`${this.endpoint}/${productId}/options`, safeOptionData);

      if (altResponse.success && altResponse.data) {
        console.log('Option created successfully via alternative endpoint:', altResponse.data);
        return altResponse.data;
      }

      console.error('Failed to create product option via API');
      return null;
    } catch (error) {
      console.error('Error creating product option:', error);

      // Son çare olarak fetch API ile direkt deneme
      try {
        console.log('Trying direct fetch for creating option');
        const directResponse = await fetch(`${apiService.getBaseUrl()}/api/product-options`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(safeOptionData),
        });

        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log('Option created successfully via direct fetch:', data);
          return data;
        }
      } catch (directError) {
        console.error('Direct fetch failed:', directError);
      }

      return null;
    }
  }

  // Get product options
  public async getProductOptions(productId: number): Promise<IProductOption[]> {
    console.log(`Fetching options for product ID: ${productId}`);

    try {
      const response = await apiService.get<IProductOption[]>(`${this.endpoint}/${productId}/options`);
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('Product options successfully fetched from API:', response.data);
        return response.data;
      }

      // Alternative endpoint for options
      try {
        const altResponse = await apiService.get<IProductOption[]>(`/product-options?product_id=${productId}`);
        if (altResponse.success && altResponse.data && Array.isArray(altResponse.data)) {
          console.log('Product options successfully fetched from alternative API:', altResponse.data);
          return altResponse.data;
        }
      } catch (altError) {
        console.warn('Alternative API for options failed:', altError);
      }

      console.log('No options found for product, returning empty array');
      return [];
    } catch (error) {
      console.error('Error in getProductOptions:', error);
      return [];
    }
  }

  // Create new product
  public async createProduct(productData: Partial<IProduct>, imageFile?: File): Promise<IProduct | null> {
    console.log('Creating product with data:', productData);
    try {
      // Önce options'ı ayır
      const productDataCopy = { ...productData };
      const options = [...(productDataCopy.options || [])];
      productDataCopy.options = undefined; // options kısmını ayırıyoruz

      // Sayısal alan kontrollerini yap
      if (typeof productDataCopy.price === 'string') {
        productDataCopy.price = Number.parseFloat(productDataCopy.price);
      }

      // Eğer görsel dosyası varsa, yükle ve URL'i al
      if (imageFile) {
        console.log('Processing image file for product:', imageFile.name);
        const imageUploadResult = await this.uploadProductImage(imageFile);

        if (imageUploadResult?.image_url) {
          productDataCopy.image_url = imageUploadResult.image_url;
          console.log('Set product image_url:', productDataCopy.image_url);
        } else {
          console.warn('Product image processing failed');
        }
      }

      // Image URL düzeltme/işleme
      if (productDataCopy.image_url !== undefined) {
        if (typeof productDataCopy.image_url === 'string' && productDataCopy.image_url.trim() === '') {
          // Boş string ise null yap
          productDataCopy.image_url = null;
          console.log('Empty image_url set to null');
        }
      }

      // Veriyi gönder
      console.log('Sending product data to API:', productDataCopy);
      const response = await apiService.post<IProduct>(this.endpoint, productDataCopy);
      console.log('Create product API response:', response);

      // Yanıt başarılı
      if (response.success && response.data) {
        const product = response.data;
        console.log('Product created successfully through API:', product);

        // Ürün oluşturuldu, şimdi seçenekleri ekle
        if (product && options.length > 0) {
          console.log(`Adding ${options.length} options to product ${product.id}`);
          const savedOptions: IProductOption[] = [];

          for (const option of options) {
            try {
              const safeOption = {
                name: option.name,
                price_modifier: typeof option.price_modifier === 'number'
                  ? option.price_modifier
                  : Number.parseFloat(String(option.price_modifier || 0)) || 0,
                is_active: option.is_active !== undefined ? option.is_active : true,
                sort_order: option.id || 0,
                product_id: product.id // Her zaman product_id ekle
              };

              console.log(`Adding option to product ${product.id}:`, safeOption);
              const optionResponse = await this.createProductOption(product.id, safeOption);

              if (optionResponse) {
                savedOptions.push(optionResponse);
                console.log('Option added successfully:', optionResponse);
              } else {
                console.error('Failed to add option to product');
              }
            } catch (optionError) {
              console.error('Error adding option:', optionError);
            }
          }

          console.log(`Added ${savedOptions.length}/${options.length} options to product ${product.id}`);

          // Eklenen seçenekleri product nesnesine ekle
          product.options = savedOptions;
        }

        return product;
      }

      console.error('Failed to create product: API returned unsuccessful response');
      return null;
    } catch (error) {
      console.error('Error creating product:', error);
      return null;
    }
  }

  // Update product
  public async updateProduct(id: number, productData: Partial<IProduct>, imageFile?: File): Promise<IProduct | null> {
    console.log(`Updating product with ID: ${id} and data:`, productData);
    try {
      // Önce options'ı ayır
      const productDataCopy = { ...productData };
      const options = [...(productDataCopy.options || [])];
      productDataCopy.options = undefined; // options kısmını ayırıyoruz

      console.log(`Options to process (${options.length}):`, options);

      // Sayısal alan kontrollerini yap
      if (typeof productDataCopy.price === 'string') {
        productDataCopy.price = Number.parseFloat(productDataCopy.price);
      }

      // Eğer görsel dosyası varsa, yükle ve URL'i al
      if (imageFile) {
        console.log('Processing image file for product update:', imageFile.name);
        const imageUploadResult = await this.uploadProductImage(imageFile);

        if (imageUploadResult?.image_url) {
          productDataCopy.image_url = imageUploadResult.image_url;
          console.log('Set product image_url:', productDataCopy.image_url);
        } else {
          console.warn('Product image processing failed');
        }
      }

      // Image URL düzeltme/işleme
      if (productDataCopy.image_url !== undefined) {
        if (typeof productDataCopy.image_url === 'string' && productDataCopy.image_url.trim() === '') {
          // Boş string ise null yap
          productDataCopy.image_url = null;
          console.log('Empty image_url set to null');
        }
      }

      // Ürünü güncelle
      console.log('Sending product update to API:', productDataCopy);
      const response = await apiService.put<IProduct>(`${this.endpoint}/${id}`, productDataCopy);
      console.log('Update product API response:', response);

      if (response.success && response.data) {
        const updatedProduct = response.data;
        console.log('Product updated successfully through API:', updatedProduct);

        // Şimdi seçenekleri işle
        if (options && options.length > 0) {
          console.log(`Processing ${options.length} options for product ${id}`);
          const savedOptions: IProductOption[] = [];

          for (const option of options) {
            try {
              // Her option için verileri temizle
              const safeOption = {
                name: option.name,
                price_modifier: typeof option.price_modifier === 'number'
                  ? option.price_modifier
                  : Number.parseFloat(String(option.price_modifier || 0)) || 0,
                is_active: option.is_active !== undefined ? option.is_active : true,
                sort_order: option.id || 0,
                product_id: id // Her zaman product_id ekle
              };

              // ID varsa güncelle, yoksa yeni ekle
              if (option.id && option.id > 0) {
                console.log(`Updating existing option ${option.id}:`, safeOption);

                try {
                  // Önce doğrudan /product-options/:id endpointini dene
                  const updateResponse = await apiService.put<IProductOption>(`/product-options/${option.id}`, safeOption);

                  if (updateResponse.success && updateResponse.data) {
                    console.log('Option updated successfully:', updateResponse.data);
                    savedOptions.push(updateResponse.data);
                    continue; // Sonraki seçeneğe geç
                  }

                  // Alternatif endpoint
                  const altUpdateResponse = await apiService.put<IProductOption>(`${this.endpoint}/options/${option.id}`, safeOption);

                  if (altUpdateResponse.success && altUpdateResponse.data) {
                    console.log('Option updated via alt endpoint:', altUpdateResponse.data);
                    savedOptions.push(altUpdateResponse.data);
                    continue; // Sonraki seçeneğe geç
                  }
                } catch (updateError) {
                  console.error(`Failed to update option ${option.id}:`, updateError);
                  // Güncelleme başarısız oldu, silip yeniden eklemeyi dene
                }
              }

              // Yeni seçenek ekle
              console.log(`Adding new option to product ${id}:`, safeOption);
              const optionResponse = await this.createProductOption(id, safeOption);

              if (optionResponse) {
                savedOptions.push(optionResponse);
                console.log('New option added successfully:', optionResponse);
              } else {
                console.error('Failed to create option');
              }
            } catch (optError) {
              console.error('Error processing option:', optError);
            }
          }

          // Eklenen ve güncellenen seçenekleri ürüne ekle
          console.log(`Processed ${savedOptions.length} options for product ${id}`);
          updatedProduct.options = savedOptions;
        }

        return updatedProduct;
      }

      console.error('Failed to update product: API returned unsuccessful response');
      return null;
    } catch (error) {
      console.error('Error updating product:', error);
      return null;
    }
  }

  // Delete product
  public async deleteProduct(id: number): Promise<boolean> {
    console.log(`Deleting product with ID: ${id}`);
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);
      console.log('Delete product API response:', response);
      if (response.success) {
        return true;
      }

      console.error('Failed to delete product through API');
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  // Update product order
  public async updateProductOrder(productIds: number[]): Promise<boolean> {
    console.log('Updating product order with IDs:', productIds);
    try {
      const response = await apiService.put(`${this.endpoint}/order`, { productIds });
      console.log('Update product order API response:', response);
      return response.success;
    } catch (error) {
      console.error('Error updating product order:', error);
      return false;
    }
  }

  // Update product option
  public async updateProductOption(
    optionId: number,
    optionData: Partial<IProductOption>
  ): Promise<IProductOption | null> {
    console.log(`Updating option with ID: ${optionId} and data:`, optionData);
    try {
      const response = await apiService.put<IProductOption>(
        `${this.endpoint}/options/${optionId}`,
        optionData
      );
      console.log('Update product option API response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.error('Failed to update product option through API');
      return null;
    } catch (error) {
      console.error('Error updating product option:', error);
      return null;
    }
  }

  // Delete product option
  public async deleteProductOption(optionId: number): Promise<boolean> {
    console.log(`Deleting product option with ID: ${optionId}`);
    try {
      const response = await apiService.delete(`${this.endpoint}/options/${optionId}`);
      console.log('Delete product option API response:', response);

      if (response.success) {
        return true;
      }

      console.error('Failed to delete product option through API');
      return false;
    } catch (error) {
      console.error('Error deleting product option:', error);
      return false;
    }
  }
}

export const productService = new ProductService();
export default productService;
