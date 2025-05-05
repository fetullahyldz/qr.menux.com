import type { ITable } from '../types';
import apiService from './api.service';

class TableService {
  private endpoint = '/tables';

  // Get all tables
  public async getTables(params?: { is_active?: boolean; status?: string }): Promise<ITable[]> {
    console.log('getTables çağrıldı, parametreler:', params);
    try {
      const response = await apiService.get<ITable[]>(this.endpoint, params);
      console.log('getTables API yanıtı:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return [];
    } catch (error) {
      console.error('getTables hata:', error);
      return [];
    }
  }

  // Get table by ID
  public async getTableById(id: number): Promise<ITable | null> {
    try {
      const response = await apiService.get<ITable>(`${this.endpoint}/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      console.log(`Masa ${id} bulunamadı`);
      return null;
    } catch (error) {
      console.error(`getTableById hata (id=${id}):`, error);
      return null;
    }
  }

  // Create new table
  public async createTable(tableData: Partial<ITable>): Promise<ITable | null> {
    console.log('createTable çağrıldı:', tableData);
    try {
      const response = await apiService.post<ITable>(this.endpoint, tableData);
      console.log('createTable API yanıtı:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return null;
    } catch (error) {
      console.error('createTable hata:', error);
      return null;
    }
  }

  // Update table
  public async updateTable(id: number, tableData: Partial<ITable>): Promise<ITable | null> {
    console.log(`updateTable çağrıldı: id=${id}, data=`, tableData);
    try {
      const response = await apiService.put<ITable>(`${this.endpoint}/${id}`, tableData);
      console.log('updateTable API yanıtı:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return null;
    } catch (error) {
      console.error(`updateTable hata (id=${id}):`, error);
      return null;
    }
  }

  // Update table status
  public async updateTableStatus(id: number, status: 'available' | 'occupied' | 'reserved'): Promise<ITable | null> {
    console.log(`updateTableStatus çağrıldı: id=${id}, status=${status}`);
    try {
      const response = await apiService.put<ITable>(`${this.endpoint}/${id}/status`, { status });

      if (response.success && response.data) {
        return response.data;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return null;
    } catch (error) {
      console.error(`updateTableStatus hata (id=${id}):`, error);
      return null;
    }
  }

  // Generate QR code for table
  public async generateQrCode(id: number): Promise<{ qr_code_url: string } | null> {
    console.log(`generateQrCode çağrıldı: id=${id}`);
    try {
      const response = await apiService.post<{ qr_code_url: string }>(`${this.endpoint}/${id}/qr-code`);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return null;
    } catch (error) {
      console.error(`generateQrCode hata (id=${id}):`, error);
      return null;
    }
  }

  // Get QR Code URL for table
  public async getQrCodeUrl(id: number): Promise<string | null> {
    console.log(`getQrCodeUrl çağrıldı: id=${id}`);
    try {
      const response = await apiService.get<{ qr_code_url: string }>(`${this.endpoint}/${id}/qr-code`);

      if (response.success && response.data) {
        return response.data.qr_code_url;
      }

      console.log('API yanıtı başarısız veya veri yok');
      return null;
    } catch (error) {
      console.error(`getQrCodeUrl hata (id=${id}):`, error);
      return null;
    }
  }

  // Delete table
  public async deleteTable(id: number): Promise<boolean> {
    console.log(`deleteTable çağrıldı: id=${id}`);
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);

      if (response.success) {
        return true;
      }

      console.log('API yanıtı başarısız');
      return false;
    } catch (error) {
      console.error(`deleteTable hata (id=${id}):`, error);
      return false;
    }
  }
}

export const tableService = new TableService();
export default tableService;
