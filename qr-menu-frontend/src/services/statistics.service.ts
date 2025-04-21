import apiService from './api.service';
import type {
  IDashboardStats,
  ISalesData,
  ISalesStatistics,
  IWeeklySalesData,
  ITopProduct,
  IFeedbackStatistics
} from '../types';

class StatisticsService {
  private endpoint = '/statistics';

  // Get dashboard statistics
  public async getDashboardStats(): Promise<IDashboardStats> {
    try {
      console.log('Fetching dashboard statistics from API...');
      const response = await apiService.get<IDashboardStats>(`${this.endpoint}/dashboard`);
      console.log('Dashboard statistics response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to fetch dashboard statistics');
      // Fallback default values
      return {
        totalOrders: 0,
        todaySales: 0,
        activeWaiterCalls: 0,
        activeTables: 0
      };
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      // Error case default values
      return {
        totalOrders: 0,
        todaySales: 0,
        activeWaiterCalls: 0,
        activeTables: 0
      };
    }
  }

  // Get recent orders
  public async getRecentOrders(limit: number = 10): Promise<any[]> {
    try {
      console.log(`Fetching recent ${limit} orders from API...`);
      const response = await apiService.get(`${this.endpoint}/recent-orders`, { limit });
      console.log('Recent orders response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to fetch recent orders');
      return [];
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }

  // Get sales data for a specific period
  public async getSalesData(options: { period: 'day' | 'week' | 'month' | 'year' } = { period: 'week' }): Promise<ISalesData[] | ISalesStatistics> {
    try {
      console.log(`Fetching sales data for period: ${options.period} from API...`);
      const response = await apiService.get(`${this.endpoint}/sales`, options);
      console.log('Sales data response:', response);

      if (response.success && response.data) {
        // Check if the response contains weekly data structure
        if (options.period === 'week' && response.data.weeklyData) {
          return response.data as ISalesStatistics;
        }

        // For other periods, return an array of sales data
        return response.data as ISalesData[];
      }

      console.warn('Failed to fetch sales data');
      // Fallback data
      if (options.period === 'week') {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderSize: 0,
          weeklyData: []
        };
      }
      return [];
    } catch (error) {
      console.error('Error fetching sales data:', error);
      // Error case default values
      if (options.period === 'week') {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderSize: 0,
          weeklyData: []
        };
      }
      return [];
    }
  }

  // Get top products
  public async getTopProducts(
    options: {
      limit?: number;
      period?: 'day' | 'week' | 'month' | 'all';
    } = {
      limit: 10,
      period: 'month'
    }
  ): Promise<ITopProduct[]> {
    try {
      console.log(`Fetching top ${options.limit} products for period: ${options.period} from API...`);
      const response = await apiService.get<ITopProduct[]>(`${this.endpoint}/top-products`, options);
      console.log('Top products response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to fetch top products');
      return [];
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  // Get feedback statistics
  public async getFeedbackStats(): Promise<IFeedbackStatistics> {
    try {
      console.log('Fetching feedback statistics from API...');
      const response = await apiService.get<IFeedbackStatistics>(`${this.endpoint}/feedback`);
      console.log('Feedback statistics response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      console.warn('Failed to fetch feedback statistics');
      // Fallback data
      return {
        averageRating: 0,
        totalCount: 0,
        ratings: []
      };
    } catch (error) {
      console.error('Error fetching feedback statistics:', error);
      // Error case default values
      return {
        averageRating: 0,
        totalCount: 0,
        ratings: []
      };
    }
  }
}

export const statisticsService = new StatisticsService();
export default statisticsService;
