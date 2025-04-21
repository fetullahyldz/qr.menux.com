import apiService from './api.service';
import type { IOrder, IOrderItem } from '../types';

interface CreateOrderData {
  table_id?: number | null;
  status?: string;
  total_amount: number;
  customer_name?: string;
  special_instructions?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    price: number;
    special_instructions?: string;
    options?: Array<{
      product_option_id: number;
      price_modifier: number;
    }>;
  }>;
  order_type?: 'table' | 'takeaway';
  customer_phone?: string;
  customer_address?: string;
}

interface OrderQueryParams {
  status?: string | string[];
  table_id?: number;
  start_date?: string;
  end_date?: string;
}

class OrderService {
  private endpoint = '/orders';

  // Get all orders with optional filters
  public async getOrders(params?: OrderQueryParams): Promise<IOrder[]> {
    console.log('getOrders called with params:', params);
    try {
      const response = await apiService.get<IOrder[]>(this.endpoint, params);
      console.log('API getOrders response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to retrieve orders from API');
      return [];
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  // Get order by ID
  public async getOrderById(id: number): Promise<IOrder | null> {
    console.log(`getOrderById called for ID: ${id}`);
    try {
      const response = await apiService.get<IOrder>(`${this.endpoint}/${id}`);
      console.log('API getOrderById response:', response);

      if (response.success && response.data) {
        // Güvenlik kontrolleri yap
        const order = { ...response.data };

        // Eğer items alanı yoksa, getOrderItems ile almayı dene
        if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
          try {
            const items = await this.getOrderItems(id);
            if (items && items.length > 0) {
              order.items = items;
            }
          } catch (itemsError) {
            console.error('Error fetching items for order:', itemsError);
          }
        }

        return order;
      }

      console.warn(`Failed to retrieve order ID ${id} from API`);
      return null;
    } catch (error) {
      console.error(`Error getting order ID ${id}:`, error);
      return null;
    }
  }

  // Create new order
  public async createOrder(orderData: CreateOrderData): Promise<IOrder | null> {
    console.log('createOrder called with data:', orderData);
    try {
      const response = await apiService.post<IOrder>(this.endpoint, orderData);
      console.log('API createOrder response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to create order via API');
      return null;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  // Update order
  public async updateOrder(id: number, orderData: Partial<IOrder>): Promise<IOrder | null> {
    console.log(`updateOrder called for ID: ${id} with data:`, orderData);
    try {
      const response = await apiService.put<IOrder>(`${this.endpoint}/${id}`, orderData);
      console.log('API updateOrder response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn(`Failed to update order ID ${id} via API`);
      return null;
    } catch (error) {
      console.error(`Error updating order ID ${id}:`, error);
      return null;
    }
  }

  // Update order status
  public async updateOrderStatus(id: number, status: string): Promise<IOrder | null> {
    console.log(`updateOrderStatus called for ID: ${id} with status: ${status}`);
    try {
      const response = await apiService.put<IOrder>(`${this.endpoint}/${id}/status`, { status });
      console.log('API updateOrderStatus response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn(`Failed to update status for order ID ${id} via API`);
      return null;
    } catch (error) {
      console.error(`Error updating status for order ID ${id}:`, error);
      return null;
    }
  }

  // Delete order
  public async deleteOrder(id: number): Promise<boolean> {
    console.log(`deleteOrder called for ID: ${id}`);
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);
      console.log('API deleteOrder response:', response);

      if (response.success) {
        return true;
      }

      console.warn(`Failed to delete order ID ${id} via API`);
      return false;
    } catch (error) {
      console.error(`Error deleting order ID ${id}:`, error);
      return false;
    }
  }

  // Get recent orders
  public async getRecentOrders(limit = 5): Promise<IOrder[]> {
    console.log(`getRecentOrders called with limit: ${limit}`);
    try {
      // API endpoint /orders/recent var mı diye kontrol et
      try {
        const response = await apiService.get<IOrder[]>(`${this.endpoint}/recent`, { limit });
        if (response.success && response.data) {
          return response.data;
        }
      } catch (recentError) {
        console.log('Recent orders endpoint not available, using alternative method');
      }

      // Alternatif olarak tüm siparişleri çek ve sırala
      const allOrders = await this.getOrders();

      // Tarihe göre sırala (en yeniden en eskiye)
      const sortedOrders = [...allOrders].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // İstenilen sayıda siparişi döndür
      return sortedOrders.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent orders:', error);
      return [];
    }
  }

  // Get order items for a specific order
  public async getOrderItems(orderId: number): Promise<IOrderItem[]> {
    console.log(`getOrderItems called for order ID: ${orderId}`);

    try {
      // İlk /orders/:id/items endpoint'ini dene
      const response = await apiService.get<IOrderItem[]>(`${this.endpoint}/${orderId}/items`);

      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('Successfully retrieved order items through API', response.data);

        // Null değerler ve eksik alanlar için güvenlik kontrolleri
        return response.data.map(item => ({
          ...item,
          product_name: item.product_name || `Ürün #${item.product_id}`, // Eğer ürün adı yoksa placeholder ekle
          options: Array.isArray(item.options)
            ? item.options.map(option => ({
                ...option,
                product_option_name: option.product_option_name || `Seçenek #${option.product_option_id}`
              }))
            : [] // Eğer options dizisi yoksa boş dizi olarak ayarla
        }));
      }

      // Alternatif endpoint olabilir
      try {
        const altResponse = await apiService.get<IOrderItem[]>(`/order-items?order_id=${orderId}`);
        if (altResponse.success && altResponse.data && Array.isArray(altResponse.data)) {
          console.log('Successfully retrieved order items through alternative API', altResponse.data);

          return altResponse.data.map(item => ({
            ...item,
            product_name: item.product_name || `Ürün #${item.product_id}`,
            options: Array.isArray(item.options)
              ? item.options.map(option => ({
                  ...option,
                  product_option_name: option.product_option_name || `Seçenek #${option.product_option_id}`
                }))
              : []
          }));
        }
      } catch (altError) {
        console.warn('Alternative API endpoint for order items failed:', altError);
      }

      console.warn(`No items found for order ID ${orderId}`);
      return [];
    } catch (error) {
      console.error(`Error getting items for order ID ${orderId}:`, error);
      return [];
    }
  }
}

export const orderService = new OrderService();
export default orderService;
