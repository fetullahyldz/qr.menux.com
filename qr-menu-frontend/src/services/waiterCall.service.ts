import type { IWaiterCall } from '../types';
import apiService from './api.service';

class WaiterCallService {
  private endpoint = '/waiter-calls';

  // Get all waiter calls
  public async getWaiterCalls(params?: {
    table_id?: number;
    status?: 'pending' | 'in_progress' | 'completed';
  }): Promise<IWaiterCall[]> {
    try {
      const response = await apiService.get<IWaiterCall[]>(this.endpoint, params);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to get waiter calls from API');
      return [];
    } catch (error) {
      console.error('Error fetching waiter calls:', error);
      return [];
    }
  }

  // Get waiter call by ID
  public async getWaiterCallById(id: number): Promise<IWaiterCall | null> {
    try {
      const response = await apiService.get<IWaiterCall>(`${this.endpoint}/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      console.log(`Waiter call with ID ${id} not found`);
      return null;
    } catch (error) {
      console.error(`Error fetching waiter call with ID ${id}:`, error);
      return null;
    }
  }

  // Create new waiter call
  public async createWaiterCall(waiterCallData: { table_id: number }): Promise<IWaiterCall | null> {
    try {
      const response = await apiService.post<IWaiterCall>(this.endpoint, waiterCallData);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to create waiter call via API');
      return null;
    } catch (error) {
      console.error('Error creating waiter call:', error);
      return null;
    }
  }

  // Update waiter call status
  public async updateWaiterCallStatus(
    id: number,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<IWaiterCall | null> {
    try {
      const response = await apiService.put<IWaiterCall>(`${this.endpoint}/${id}/status`, { status });

      if (response.success && response.data) {
        return response.data;
      }

      console.log(`Failed to update waiter call status for ID ${id}`);
      return null;
    } catch (error) {
      console.error(`Error updating waiter call status for ID ${id}:`, error);
      return null;
    }
  }

  // Delete waiter call
  public async deleteWaiterCall(id: number): Promise<boolean> {
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);

      if (response.success) {
        return true;
      }

      console.log(`Failed to delete waiter call with ID ${id}`);
      return false;
    } catch (error) {
      console.error(`Error deleting waiter call with ID ${id}:`, error);
      return false;
    }
  }

  // Get active waiter calls count
  public async getActiveWaiterCallsCount(): Promise<number> {
    try {
      const response = await apiService.get<{ count: number }>(`${this.endpoint}/active/count`);

      if (response.success && response.data) {
        return response.data.count;
      }

      console.log('Failed to get active waiter calls count');
      return 0;
    } catch (error) {
      console.error('Error fetching active waiter calls count:', error);
      return 0;
    }
  }

  // Get recent waiter calls
  public async getRecentWaiterCalls(limit = 5): Promise<IWaiterCall[]> {
    try {
      const response = await apiService.get<IWaiterCall[]>(`${this.endpoint}/recent`, { limit });

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to get recent waiter calls');
      return [];
    } catch (error) {
      console.error('Error fetching recent waiter calls:', error);
      return [];
    }
  }
}

export const waiterCallService = new WaiterCallService();
export default waiterCallService;
